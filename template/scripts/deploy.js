import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🚀 Starting RSWF deployment...');

// Load configuration
async function loadConfig() {
  const configPath = path.join(rootDir, 'rswf.config.js');
  
  if (!fs.existsSync(configPath)) {
    console.error('❌ Error: rswf.config.js not found!');
    console.log('Please create a rswf.config.js file with your AWS S3 configuration.');
    console.log('You can copy the template from the repository and update the values.');
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

  const { bucketName, region } = config.deploy;

  if (!bucketName || bucketName === 'your-website-bucket-name') {
    console.error('❌ Error: Please set a valid bucketName in rswf.config.js');
    process.exit(1);
  }

  if (!region) {
    console.error('❌ Error: Please set a valid region in rswf.config.js');
    process.exit(1);
  }

  console.log(`✓ Configuration valid - deploying to bucket: ${bucketName} in region: ${region}`);
}

// Check if AWS CLI is installed
function checkAwsCli() {
  try {
    execSync('aws --version', { stdio: 'pipe' });
    console.log('✓ AWS CLI is installed');
  } catch (error) {
    console.error('❌ Error: AWS CLI is not installed or not in PATH');
    console.log('Please install AWS CLI: https://aws.amazon.com/cli/');
    process.exit(1);
  }
}

// Check if dist directory exists
function checkDistDirectory() {
  const distPath = path.join(rootDir, 'dist');
  
  if (!fs.existsSync(distPath)) {
    console.error('❌ Error: dist directory not found!');
    console.log('Please run "npm run build" first to generate the static site.');
    process.exit(1);
  }

  const files = fs.readdirSync(distPath);
  if (files.length === 0) {
    console.error('❌ Error: dist directory is empty!');
    console.log('Please run "npm run build" first to generate the static site.');
    process.exit(1);
  }

  console.log('✓ Built site found in dist directory');
}

// Set up AWS environment variables if provided in config
function setupAwsEnvironment(config) {
  const { aws } = config.deploy;
  
  if (aws) {
    if (aws.accessKeyId && aws.secretAccessKey) {
      process.env.AWS_ACCESS_KEY_ID = aws.accessKeyId;
      process.env.AWS_SECRET_ACCESS_KEY = aws.secretAccessKey;
      console.log('✓ Using AWS credentials from config');
    }
    
    if (aws.profile) {
      process.env.AWS_PROFILE = aws.profile;
      console.log(`✓ Using AWS profile: ${aws.profile}`);
    }
  }

  if (config.deploy.region) {
    process.env.AWS_DEFAULT_REGION = config.deploy.region;
  }
}

// Test AWS credentials
function testAwsCredentials() {
  try {
    execSync('aws sts get-caller-identity', { stdio: 'pipe' });
    console.log('✓ AWS credentials are valid');
  } catch (error) {
    console.error('❌ Error: AWS credentials are not configured or invalid');
    console.log('Please configure AWS credentials using one of these methods:');
    console.log('1. AWS CLI: aws configure');
    console.log('2. Environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
    console.log('3. IAM roles (for EC2/Lambda)');
    console.log('4. Update rswf.config.js with your credentials');
    process.exit(1);
  }
}

// Build AWS CLI sync command
function buildSyncCommand(config) {
  const { bucketName, options = {} } = config.deploy;
  const distPath = path.join(rootDir, 'dist');
  
  let command = `aws s3 sync "${distPath}" s3://${bucketName}`;
  
  // Add delete flag if specified
  if (options.deleteRemoved) {
    command += ' --delete';
  }
  
  // Add exclude patterns
  if (options.exclude && options.exclude.length > 0) {
    options.exclude.forEach(pattern => {
      command += ` --exclude "${pattern}"`;
    });
  }
  
  return command;
}

// Set cache control headers for different file types
async function setCacheControlHeaders(config) {
  const { bucketName, options = {} } = config.deploy;
  const { cacheControl } = options;
  
  if (!cacheControl) {
    console.log('ℹ️ No cache control settings found, skipping cache headers');
    return;
  }

  console.log('🔧 Setting cache control headers...');

  // Get list of files in the bucket
  try {
    const listCommand = `aws s3api list-objects-v2 --bucket ${bucketName} --query "Contents[].Key" --output text`;
    const files = execSync(listCommand, { encoding: 'utf8' }).trim().split('\t').filter(f => f);

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      let cacheControlValue = cacheControl.default || 'public, max-age=86400';

      // Determine content type and cache control
      if (file.endsWith('.html')) {
        cacheControlValue = cacheControl['text/html'] || cacheControlValue;
      } else if (ext === '.css') {
        cacheControlValue = cacheControl['text/css'] || cacheControlValue;
      } else if (ext === '.js') {
        cacheControlValue = cacheControl['application/javascript'] || cacheControlValue;
      } else if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(ext)) {
        cacheControlValue = cacheControl['image/*'] || cacheControlValue;
      }

      // Set cache control for this file
      const cacheCommand = `aws s3api copy-object --bucket ${bucketName} --copy-source ${bucketName}/${file} --key "${file}" --cache-control "${cacheControlValue}" --metadata-directive REPLACE`;
      
      try {
        execSync(cacheCommand, { stdio: 'pipe' });
      } catch (error) {
        console.warn(`⚠️ Warning: Could not set cache control for ${file}`);
      }
    }

    console.log('✓ Cache control headers set');
  } catch (error) {
    console.warn('⚠️ Warning: Could not set cache control headers:', error.message);
  }
}

// Invalidate CloudFront cache
async function invalidateCloudFront(config) {
  const { cloudfront } = config.deploy;
  
  if (!cloudfront || !cloudfront.distributionId) {
    console.log('ℹ️ No CloudFront distribution ID found, skipping cache invalidation');
    console.log('💡 Run "npm run deploy-setup" first to create CloudFront distribution');
    return;
  }

  if (cloudfront.autoInvalidate === false) {
    console.log('ℹ️ CloudFront auto-invalidation is disabled');
    return;
  }

  console.log('🔄 Invalidating CloudFront cache...');

  try {
    // Smart invalidation - only invalidate HTML files and unversioned assets
    // Vite already handles versioning for CSS/JS files
    const pathsToInvalidate = [
      '/',           // index.html
      '/index.html',
      '/*/',         // All page directories (clean URLs)
      '/robots.txt',
      '/sitemap.xml'
    ];

    // Allow custom invalidation paths
    const customPaths = cloudfront.invalidatePaths || [];
    const allPaths = [...new Set([...pathsToInvalidate, ...customPaths])];

    const invalidationConfig = {
      Paths: {
        Quantity: allPaths.length,
        Items: allPaths
      },
      CallerReference: `rswf-deploy-${Date.now()}`
    };

    fs.writeFileSync('/tmp/invalidation-config.json', JSON.stringify(invalidationConfig));
    
    const command = `aws cloudfront create-invalidation --distribution-id ${cloudfront.distributionId} --invalidation-batch file:///tmp/invalidation-config.json --output json`;
    const result = execSync(command, { encoding: 'utf8' });
    const response = JSON.parse(result);
    
    const invalidationId = response.Invalidation.Id;
    console.log(`✓ CloudFront invalidation created: ${invalidationId}`);
    console.log(`📋 Invalidated paths: ${allPaths.join(', ')}`);
    
    // Clean up temp file
    try {
      fs.unlinkSync('/tmp/invalidation-config.json');
    } catch (error) {
      // Ignore cleanup errors
    }
    
  } catch (error) {
    console.warn('⚠️ Warning: CloudFront invalidation failed:', error.message);
    console.log('💡 You can manually invalidate the cache in the AWS CloudFront console');
  }
}

// Main deployment function
async function deploy() {
  try {
    // Load and validate configuration
    const config = await loadConfig();
    validateConfig(config);

    // Pre-deployment checks
    checkAwsCli();
    checkDistDirectory();
    setupAwsEnvironment(config);
    testAwsCredentials();

    // Build and execute sync command
    const syncCommand = buildSyncCommand(config);
    console.log('📤 Uploading files to S3...');
    console.log(`Command: ${syncCommand}`);

    execSync(syncCommand, { stdio: 'inherit' });
    console.log('✓ Files uploaded successfully');

    // Set cache control headers
    await setCacheControlHeaders(config);

    // Invalidate CloudFront cache
    await invalidateCloudFront(config);

    // Success message
    console.log('🎉 Deployment completed successfully!');
    
    if (config.deploy.cloudfront && config.deploy.cloudfront.distributionId) {
      console.log(`🌐 Your site is now live at: https://${config.deploy.domain}`);
      console.log('⏳ CloudFront cache invalidation may take a few minutes to propagate');
    } else {
      console.log(`🌐 Your site is now live at: https://${config.deploy.bucketName}.s3-website-${config.deploy.region}.amazonaws.com`);
      console.log('💡 Run "npm run deploy-setup" to set up CloudFront and custom domain');
    }

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run deployment
deploy();