import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🚀 Starting AWS infrastructure setup for RSWF...');

// Load configuration
async function loadConfig() {
  const configPath = path.join(rootDir, 'rswf.config.js');
  
  if (!fs.existsSync(configPath)) {
    console.error('❌ Error: rswf.config.js not found!');
    console.log('Please create a rswf.config.js file with your domain configuration.');
    process.exit(1);
  }

  try {
    const configModule = await import(`file://${configPath}`);
    return configModule.default;
  } catch (error) {
    console.error('❌ Error loading configuration:', error.message);
    process.exit(1);
  }
}

// Validate configuration
function validateConfig(config) {
  if (!config.deploy) {
    console.error('❌ Error: Missing deploy configuration in rswf.config.js');
    process.exit(1);
  }

  const { domain } = config.deploy;

  if (!domain) {
    console.error('❌ Error: Please set a domain in rswf.config.js');
    console.log('Example: domain: "example.com" or domain: "blog.example.com"');
    process.exit(1);
  }

  console.log(`✓ Configuration valid - setting up infrastructure for: ${domain}`);
  return domain;
}

// Extract root domain from any domain/subdomain
function getRootDomain(domain) {
  const parts = domain.split('.');
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  return domain;
}

// Check if domain is a subdomain
function isSubdomain(domain) {
  const parts = domain.split('.');
  return parts.length > 2;
}

// Helper function to build AWS CLI commands with optional profile
function buildAwsCommand(baseCommand, profile = null) {
  if (profile) {
    return `aws --profile ${profile} ${baseCommand}`;
  }
  return `aws ${baseCommand}`;
}

// Check AWS CLI and credentials
function checkAwsPrerequisites(profile = null) {
  try {
    execSync('aws --version', { stdio: 'pipe' });
    console.log('✓ AWS CLI is installed');
  } catch (error) {
    console.error('❌ Error: AWS CLI is not installed');
    console.log('Please install AWS CLI: https://aws.amazon.com/cli/');
    process.exit(1);
  }

  try {
    const command = buildAwsCommand('sts get-caller-identity', profile);
    execSync(command, { stdio: 'pipe' });
    if (profile) {
      console.log(`✓ AWS credentials are valid for profile: ${profile}`);
    } else {
      console.log('✓ AWS credentials are valid');
    }
  } catch (error) {
    if (profile) {
      console.error(`❌ Error: AWS credentials not configured for profile: ${profile}`);
      console.log(`Please run: aws configure --profile ${profile}`);
    } else {
      console.error('❌ Error: AWS credentials not configured');
      console.log('Please run: aws configure');
    }
    process.exit(1);
  }
}

// Find existing hosted zone
function findHostedZone(domain, profile = null) {
  try {
    const command = buildAwsCommand(`route53 list-hosted-zones --query "HostedZones[?Name=='${domain}.'].{Id:Id,Name:Name}" --output json`, profile);
    const result = execSync(command, { encoding: 'utf8' });
    const zones = JSON.parse(result);
    
    if (zones.length > 0) {
      const zoneId = zones[0].Id.replace('/hostedzone/', '');
      console.log(`✓ Found existing hosted zone for ${domain}: ${zoneId}`);
      return zoneId;
    }
    
    return null;
  } catch (error) {
    console.warn(`⚠️ Could not check for existing hosted zone: ${error.message}`);
    return null;
  }
}

// Create hosted zone
function createHostedZone(domain, profile = null) {
  try {
    console.log(`📝 Creating hosted zone for ${domain}...`);
    
    const command = buildAwsCommand(`route53 create-hosted-zone --name ${domain} --caller-reference ${Date.now()} --output json`, profile);
    const result = execSync(command, { encoding: 'utf8' });
    const response = JSON.parse(result);
    
    const zoneId = response.HostedZone.Id.replace('/hostedzone/', '');
    console.log(`✓ Created hosted zone: ${zoneId}`);
    
    // Display nameservers
    const nsCommand = buildAwsCommand(`route53 get-hosted-zone --id ${zoneId} --query "DelegationSet.NameServers" --output json`, profile);
    const nsResult = execSync(nsCommand, { encoding: 'utf8' });
    const nameServers = JSON.parse(nsResult);
    
    console.log('📋 Nameservers for your domain registrar:');
    nameServers.forEach(ns => console.log(`   ${ns}`));
    
    return zoneId;
  } catch (error) {
    console.error(`❌ Failed to create hosted zone: ${error.message}`);
    process.exit(1);
  }
}

// Get or create hosted zone
function setupHostedZone(domain, profile = null) {
  const rootDomain = getRootDomain(domain);
  
  // First, check if root domain has a hosted zone
  let hostedZoneId = findHostedZone(rootDomain, profile);
  
  if (!hostedZoneId) {
    // No hosted zone for root domain, create one
    hostedZoneId = createHostedZone(rootDomain, profile);
  }
  
  return { hostedZoneId, zoneDomain: rootDomain };
}

// Check if S3 bucket exists
function checkS3Bucket(bucketName, profile = null) {
  try {
    const command = buildAwsCommand(`s3api head-bucket --bucket ${bucketName}`, profile);
    execSync(command, { stdio: 'pipe' });
    console.log(`✓ S3 bucket ${bucketName} already exists`);
    return true;
  } catch (error) {
    return false;
  }
}

// Create S3 bucket
function createS3Bucket(bucketName, region, profile = null) {
  try {
    console.log(`📦 Creating S3 bucket: ${bucketName}...`);
    
    // Create bucket
    if (region === 'us-east-1') {
      const command = buildAwsCommand(`s3api create-bucket --bucket ${bucketName} --region ${region}`, profile);
      execSync(command, { stdio: 'pipe' });
    } else {
      const command = buildAwsCommand(`s3api create-bucket --bucket ${bucketName} --region ${region} --create-bucket-configuration LocationConstraint=${region}`, profile);
      execSync(command, { stdio: 'pipe' });
    }
    
    // Disable public access block
    console.log('🔓 Disabling public access block...');
    const deleteBlockCommand = buildAwsCommand(`s3api delete-public-access-block --bucket ${bucketName}`, profile);
    execSync(deleteBlockCommand, { stdio: 'pipe' });
    
    // Enable versioning
    console.log('📚 Enabling versioning...');
    const versioningCommand = buildAwsCommand(`s3api put-bucket-versioning --bucket ${bucketName} --versioning-configuration Status=Enabled`, profile);
    execSync(versioningCommand, { stdio: 'pipe' });
    
    // Configure website hosting
    console.log('🌐 Configuring static website hosting...');
    const websiteConfig = {
      IndexDocument: { Suffix: 'index.html' },
      ErrorDocument: { Key: 'index.html' }
    };
    
    const websiteConfigPath = path.join(os.tmpdir(), 'website-config.json');
    fs.writeFileSync(websiteConfigPath, JSON.stringify(websiteConfig));
    const websiteCommand = buildAwsCommand(`s3api put-bucket-website --bucket ${bucketName} --website-configuration file://${websiteConfigPath}`, profile);
    execSync(websiteCommand, { stdio: 'pipe' });
    
    // Set bucket policy for public read
    console.log('📋 Setting bucket policy for public read...');
    const bucketPolicy = {
      Version: '2012-10-17',
      Statement: [{
        Sid: 'PublicReadGetObject',
        Effect: 'Allow',
        Principal: '*',
        Action: 's3:GetObject',
        Resource: `arn:aws:s3:::${bucketName}/*`
      }]
    };
    
    const bucketPolicyPath = path.join(os.tmpdir(), 'bucket-policy.json');
    fs.writeFileSync(bucketPolicyPath, JSON.stringify(bucketPolicy));
    const policyCommand = buildAwsCommand(`s3api put-bucket-policy --bucket ${bucketName} --policy file://${bucketPolicyPath}`, profile);
    execSync(policyCommand, { stdio: 'pipe' });
    
    console.log(`✓ S3 bucket ${bucketName} configured successfully`);
    
  } catch (error) {
    console.error(`❌ Failed to create S3 bucket: ${error.message}`);
    process.exit(1);
  }
}

// Check for existing SSL certificates that cover the required domains
function findExistingSSLCertificate(domains, profile = null) {
  try {
    console.log('🔍 Checking for existing SSL certificates...');
    
    const command = buildAwsCommand(`acm list-certificates --region us-east-1 --output json`, profile);
    const result = execSync(command, { encoding: 'utf8' });
    const response = JSON.parse(result);
    
    for (const cert of response.CertificateSummaryList) {
      if (cert.Status === 'ISSUED') {
        // Check if this certificate covers all required domains
        const describeCommand = buildAwsCommand(`acm describe-certificate --certificate-arn ${cert.CertificateArn} --region us-east-1 --output json`, profile);
        const describeResult = execSync(describeCommand, { encoding: 'utf8' });
        const certDetails = JSON.parse(describeResult);
        
        const certDomains = [certDetails.Certificate.DomainName, ...(certDetails.Certificate.SubjectAlternativeNames || [])];
        const coversAllDomains = domains.every(domain => certDomains.includes(domain));
        
        if (coversAllDomains) {
          console.log(`✓ Found existing certificate that covers all required domains: ${cert.CertificateArn}`);
          console.log(`📋 Certificate covers: ${certDomains.join(', ')}`);
          return cert.CertificateArn;
        }
      }
    }
    
    console.log('ℹ️ No existing certificate found that covers all required domains');
    return null;
  } catch (error) {
    console.warn(`⚠️ Could not check for existing certificates: ${error.message}`);
    return null;
  }
}

// Request SSL certificate
async function requestSSLCertificate(domain, profile = null) {
  try {
    console.log(`🔒 Requesting SSL certificate for ${domain}...`);
    
    // Include www variant for root domains
    const domains = isSubdomain(domain) ? [domain] : [domain, `www.${domain}`];
    
    // Build the correct AWS CLI command format
    let certificateCommand = `acm request-certificate --domain-name ${domains[0]}`;
    if (domains.length > 1) {
      const sanDomains = domains.slice(1).join(' ');
      certificateCommand += ` --subject-alternative-names ${sanDomains}`;
    }
    certificateCommand += ` --validation-method DNS --region us-east-1 --output json`;
    
    const command = buildAwsCommand(certificateCommand, profile);
    const result = execSync(command, { encoding: 'utf8' });
    const response = JSON.parse(result);
    
    const certificateArn = response.CertificateArn;
    console.log(`✓ SSL certificate requested: ${certificateArn}`);
    
    // Wait for certificate details
    console.log('⏳ Waiting for certificate validation records...');
    let validationRecords = null;
    let attempts = 0;
    
    while (!validationRecords && attempts < 30) {
      try {
        const describeCommand = buildAwsCommand(`acm describe-certificate --certificate-arn ${certificateArn} --region us-east-1 --output json`, profile);
        const describeResult = execSync(describeCommand, { encoding: 'utf8' });
        const certDetails = JSON.parse(describeResult);
        
        console.log(`⏳ Attempt ${attempts + 1}/30 - Checking certificate validation records...`);
        
        if (certDetails.Certificate.DomainValidationOptions) {
          const domainOptions = certDetails.Certificate.DomainValidationOptions;
          console.log(`📋 Found ${domainOptions.length} domain validation option(s)`);
          
          // Check if ALL domain validation options have ResourceRecord populated
          const allHaveResourceRecords = domainOptions.every(option => {
            const hasResourceRecord = option.ResourceRecord && 
                                    option.ResourceRecord.Name && 
                                    option.ResourceRecord.Type && 
                                    option.ResourceRecord.Value;
            
            if (!hasResourceRecord) {
              console.log(`⏳ Domain ${option.DomainName} validation record not ready yet`);
            } else {
              console.log(`✓ Domain ${option.DomainName} validation record ready`);
            }
            
            return hasResourceRecord;
          });
          
          if (allHaveResourceRecords) {
            validationRecords = domainOptions;
            console.log(`✓ All ${domainOptions.length} validation record(s) are ready`);
            break;
          }
        } else {
          console.log('⏳ No domain validation options found yet');
        }
      } catch (error) {
        console.log(`⚠️ Error checking certificate details: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }
    
    if (!validationRecords) {
      console.error('❌ Timeout waiting for certificate validation records');
      process.exit(1);
    }
    
    return { certificateArn, validationRecords };
    
  } catch (error) {
    console.error(`❌ Failed to request SSL certificate: ${error.message}`);
    process.exit(1);
  }
}

// Create DNS validation records
function createValidationRecords(hostedZoneId, validationRecords, profile = null) {
  try {
    console.log('📝 Creating DNS validation records...');
    
    // Validate that validationRecords is iterable and has content
    if (!validationRecords) {
      console.error('❌ Error: validationRecords is null or undefined');
      process.exit(1);
    }
    
    if (!Array.isArray(validationRecords)) {
      console.error('❌ Error: validationRecords is not an array:', typeof validationRecords);
      console.log('validationRecords value:', validationRecords);
      process.exit(1);
    }
    
    if (validationRecords.length === 0) {
      console.error('❌ Error: validationRecords array is empty');
      process.exit(1);
    }
    
    console.log(`📋 Processing ${validationRecords.length} validation record(s)...`);
    
    for (const record of validationRecords) {
      const resourceRecord = record.ResourceRecord;
      
      const changeSet = {
        Changes: [{
          Action: 'UPSERT',
          ResourceRecordSet: {
            Name: resourceRecord.Name,
            Type: resourceRecord.Type,
            TTL: 300,
            ResourceRecords: [{ Value: resourceRecord.Value }]
          }
        }]
      };
      
      const validationRecordPath = path.join(os.tmpdir(), 'validation-record.json');
      fs.writeFileSync(validationRecordPath, JSON.stringify(changeSet));
      const command = buildAwsCommand(`route53 change-resource-record-sets --hosted-zone-id ${hostedZoneId} --change-batch file://${validationRecordPath}`, profile);
      
      try {
        execSync(command, { stdio: 'pipe' });
        console.log(`✓ Created/updated validation record for ${resourceRecord.Name}`);
      } catch (error) {
        // If UPSERT fails, log the error but continue with other records
        console.warn(`⚠️ Warning: Could not create/update validation record for ${resourceRecord.Name}: ${error.message}`);
        
        // Check if the record already exists and has the correct value
        try {
          const listCommand = buildAwsCommand(`route53 list-resource-record-sets --hosted-zone-id ${hostedZoneId} --query "ResourceRecordSets[?Name=='${resourceRecord.Name}' && Type=='${resourceRecord.Type}'].ResourceRecords[0].Value" --output text`, profile);
          const existingValue = execSync(listCommand, { encoding: 'utf8' }).trim();
          
          if (existingValue === resourceRecord.Value) {
            console.log(`✓ Validation record for ${resourceRecord.Name} already exists with correct value`);
          } else {
            console.error(`❌ Validation record for ${resourceRecord.Name} exists but has wrong value. Expected: ${resourceRecord.Value}, Found: ${existingValue}`);
            throw new Error(`Validation record mismatch for ${resourceRecord.Name}`);
          }
        } catch (checkError) {
          console.error(`❌ Could not verify existing validation record: ${checkError.message}`);
          throw error; // Re-throw original error
        }
      }
    }
    
    console.log('✓ DNS validation records created');
    
  } catch (error) {
    console.error(`❌ Failed to create validation records: ${error.message}`);
    process.exit(1);
  }
}

// Wait for certificate validation
async function waitForCertificateValidation(certificateArn, profile = null) {
  console.log('⏳ Waiting for SSL certificate validation (this may take several minutes)...');
  
  let attempts = 0;
  const maxAttempts = 60; // 10 minutes
  
  while (attempts < maxAttempts) {
    try {
      const command = buildAwsCommand(`acm describe-certificate --certificate-arn ${certificateArn} --region us-east-1 --query "Certificate.Status" --output text`, profile);
      const status = execSync(command, { encoding: 'utf8' }).trim();
      
      if (status === 'ISSUED') {
        console.log('✓ SSL certificate validated and issued');
        return;
      }
      
      if (status === 'FAILED') {
        console.error('❌ SSL certificate validation failed');
        process.exit(1);
      }
      
    } catch (error) {
      // Continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    attempts++;
    
    if (attempts % 6 === 0) { // Every minute
      console.log(`⏳ Still waiting for certificate validation... (${attempts * 10}s)`);
    }
  }
  
  console.error('❌ Timeout waiting for certificate validation');
  process.exit(1);
}

// Create CloudFront distribution
function createCloudFrontDistribution(bucketName, domain, certificateArn, region, profile = null) {
  try {
    console.log('☁️ Creating CloudFront distribution...');
    
    const originDomain = `${bucketName}.s3-website-${region}.amazonaws.com`;
    const aliases = isSubdomain(domain) ? [domain] : [domain, `www.${domain}`];
    
    const distributionConfig = {
      CallerReference: `rswf-${Date.now()}`,
      Aliases: {
        Quantity: aliases.length,
        Items: aliases
      },
      DefaultRootObject: 'index.html',
      Comment: `RSWF distribution for ${domain}`,
      Enabled: true,
      Origins: {
        Quantity: 1,
        Items: [{
          Id: 'S3Origin',
          DomainName: originDomain,
          CustomOriginConfig: {
            HTTPPort: 80,
            HTTPSPort: 443,
            OriginProtocolPolicy: 'http-only'
          }
        }]
      },
      DefaultCacheBehavior: {
        TargetOriginId: 'S3Origin',
        ViewerProtocolPolicy: 'redirect-to-https',
        TrustedSigners: {
          Enabled: false,
          Quantity: 0
        },
        ForwardedValues: {
          QueryString: false,
          Cookies: { Forward: 'none' }
        },
        MinTTL: 0,
        DefaultTTL: 86400,
        MaxTTL: 31536000,
        Compress: true
      },
      CacheBehaviors: {
        Quantity: 2,
        Items: [
          {
            PathPattern: '*.html',
            TargetOriginId: 'S3Origin',
            ViewerProtocolPolicy: 'redirect-to-https',
            TrustedSigners: { Enabled: false, Quantity: 0 },
            ForwardedValues: { QueryString: false, Cookies: { Forward: 'none' } },
            MinTTL: 0,
            DefaultTTL: 3600,
            MaxTTL: 86400,
            Compress: true
          },
          {
            PathPattern: '/assets/*',
            TargetOriginId: 'S3Origin',
            ViewerProtocolPolicy: 'redirect-to-https',
            TrustedSigners: { Enabled: false, Quantity: 0 },
            ForwardedValues: { QueryString: false, Cookies: { Forward: 'none' } },
            MinTTL: 0,
            DefaultTTL: 31536000,
            MaxTTL: 31536000,
            Compress: true
          }
        ]
      },
      CustomErrorResponses: {
        Quantity: 1,
        Items: [{
          ErrorCode: 404,
          ResponsePagePath: '/index.html',
          ResponseCode: '200',
          ErrorCachingMinTTL: 300
        }]
      },
      ViewerCertificate: {
        ACMCertificateArn: certificateArn,
        SSLSupportMethod: 'sni-only',
        MinimumProtocolVersion: 'TLSv1.2_2021'
      },
      PriceClass: 'PriceClass_100'
    };
    
    const distributionConfigPath = path.join(os.tmpdir(), 'distribution-config.json');
    fs.writeFileSync(distributionConfigPath, JSON.stringify(distributionConfig));
    
    const command = buildAwsCommand(`cloudfront create-distribution --distribution-config file://${distributionConfigPath} --output json`, profile);
    const result = execSync(command, { encoding: 'utf8' });
    const response = JSON.parse(result);
    
    const distributionId = response.Distribution.Id;
    const distributionDomain = response.Distribution.DomainName;
    
    console.log(`✓ CloudFront distribution created: ${distributionId}`);
    console.log(`📡 Distribution domain: ${distributionDomain}`);
    
    return { distributionId, distributionDomain };
    
  } catch (error) {
    console.error(`❌ Failed to create CloudFront distribution: ${error.message}`);
    process.exit(1);
  }
}

// Create Route53 DNS records
function createDNSRecords(hostedZoneId, domain, distributionDomain, profile = null) {
  try {
    console.log('📝 Creating DNS records...');
    
    const records = isSubdomain(domain) ? [domain] : [domain, `www.${domain}`];
    
    for (const recordName of records) {
      const changeSet = {
        Changes: [{
          Action: 'CREATE',
          ResourceRecordSet: {
            Name: recordName,
            Type: 'A',
            AliasTarget: {
              DNSName: distributionDomain,
              EvaluateTargetHealth: false,
              HostedZoneId: 'Z2FDTNDATAQYW2' // CloudFront hosted zone ID
            }
          }
        }]
      };
      
      const dnsRecordPath = path.join(os.tmpdir(), 'dns-record.json');
      fs.writeFileSync(dnsRecordPath, JSON.stringify(changeSet));
      
      try {
        const command = buildAwsCommand(`route53 change-resource-record-sets --hosted-zone-id ${hostedZoneId} --change-batch file://${dnsRecordPath}`, profile);
        execSync(command, { stdio: 'pipe' });
        console.log(`✓ Created DNS record for ${recordName}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️ DNS record for ${recordName} already exists, skipping`);
        } else {
          throw error;
        }
      }
    }
    
  } catch (error) {
    console.error(`❌ Failed to create DNS records: ${error.message}`);
    process.exit(1);
  }
}

// Update configuration file
function updateConfigFile(domain, distributionId) {
  try {
    const configPath = path.join(rootDir, 'rswf.config.js');
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    // Update or add distributionId
    if (configContent.includes('distributionId:')) {
      configContent = configContent.replace(
        /distributionId:\s*['"][^'"]*['"]/,
        `distributionId: '${distributionId}'`
      );
    } else {
      // Add cloudfront section if it doesn't exist
      if (!configContent.includes('cloudfront:')) {
        configContent = configContent.replace(
          /(\s+)(\/\/ Deployment options)/,
          `$1cloudfront: {\n$1  distributionId: '${distributionId}',\n$1  autoInvalidate: true\n$1},\n\n$1$2`
        );
      } else {
        configContent = configContent.replace(
          /(cloudfront:\s*{[^}]*)/,
          `$1\n      distributionId: '${distributionId}',`
        );
      }
    }
    
    fs.writeFileSync(configPath, configContent);
    console.log('✓ Updated rswf.config.js with CloudFront distribution ID');
    
  } catch (error) {
    console.warn(`⚠️ Could not update config file: ${error.message}`);
    console.log(`📝 Please manually add this to your rswf.config.js:`);
    console.log(`   cloudfront: { distributionId: '${distributionId}' }`);
  }
}

// Clean up temporary files
function cleanup() {
  const tempFiles = [
    'website-config.json',
    'bucket-policy.json',
    'validation-record.json',
    'distribution-config.json',
    'dns-record.json'
  ];
  
  tempFiles.forEach(fileName => {
    try {
      const filePath = path.join(os.tmpdir(), fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });
}

// Main setup function
async function setupInfrastructure() {
  try {
    // Load and validate configuration
    const config = await loadConfig();
    const domain = validateConfig(config);
    const region = config.deploy.region || 'us-east-1';
    const bucketName = config.deploy.bucketName || domain;
    const awsProfile = config.deploy.aws?.profile;
    
    // Prerequisites check
    checkAwsPrerequisites(awsProfile);
    
    console.log('\n🏗️ Starting AWS infrastructure setup...');
    console.log(`📍 Domain: ${domain}`);
    console.log(`📦 S3 Bucket: ${bucketName}`);
    console.log(`🌍 Region: ${region}`);
    if (awsProfile) {
      console.log(`🔑 AWS Profile: ${awsProfile}`);
    }
    console.log('');
    
    // Step 1: Setup Route53 hosted zone
    console.log('1️⃣ Setting up Route53 hosted zone...');
    const { hostedZoneId, zoneDomain } = setupHostedZone(domain, awsProfile);
    
    // Step 2: Create S3 bucket
    console.log('\n2️⃣ Setting up S3 bucket...');
    if (!checkS3Bucket(bucketName, awsProfile)) {
      createS3Bucket(bucketName, region, awsProfile);
    }
    
    // Step 3: Setup SSL certificate
    console.log('\n3️⃣ Setting up SSL certificate...');
    const domains = isSubdomain(domain) ? [domain] : [domain, `www.${domain}`];
    let certificateArn = findExistingSSLCertificate(domains, awsProfile);
    
    if (!certificateArn) {
      const { certificateArn: newCertArn, validationRecords } = await requestSSLCertificate(domain, awsProfile);
      certificateArn = newCertArn;
      
      // Step 4: Create DNS validation records
      createValidationRecords(hostedZoneId, validationRecords, awsProfile);
      
      // Step 5: Wait for certificate validation
      await waitForCertificateValidation(certificateArn, awsProfile);
    } else {
      console.log('✓ Using existing SSL certificate');
    }
    
    // Step 4: Create CloudFront distribution
    console.log('\n4️⃣ Setting up CloudFront distribution...');
    const { distributionId, distributionDomain } = createCloudFrontDistribution(bucketName, domain, certificateArn, region, awsProfile);
    
    // Step 5: Create DNS records
    console.log('\n5️⃣ Setting up DNS records...');
    createDNSRecords(hostedZoneId, domain, distributionDomain, awsProfile);
    
    // Step 6: Update configuration
    updateConfigFile(domain, distributionId);
    
    // Success!
    console.log('\n🎉 AWS infrastructure setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   🌐 Domain: ${domain}`);
    console.log(`   📦 S3 Bucket: ${bucketName}`);
    console.log(`   ☁️ CloudFront: ${distributionId}`);
    console.log(`   🔒 SSL Certificate: ${certificateArn}`);
    console.log(`   📡 Hosted Zone: ${hostedZoneId} (${zoneDomain})`);
    
    console.log('\n⏳ Note: CloudFront distribution deployment may take 15-20 minutes to complete.');
    console.log('💡 You can now run "npm run build && npm run deploy" to upload your site!');
    
    if (!isSubdomain(domain)) {
      console.log(`🌐 Your site will be available at: https://${domain} and https://www.${domain}`);
    } else {
      console.log(`🌐 Your site will be available at: https://${domain}`);
    }
    
  } catch (error) {
    console.error('\n❌ Infrastructure setup failed:', error.message);
    process.exit(1);
  } finally {
    cleanup();
  }
}

// Run setup
setupInfrastructure();