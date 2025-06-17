import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { execSync, spawnSync } from 'child_process';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';

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

// Helper function to build AWS CLI commands with optional profile
function buildAwsCommand(baseCommand, profile = null) {
  if (profile) {
    return `aws --profile ${profile} ${baseCommand}`;
  }
  return `aws ${baseCommand}`;
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
  }

  if (config.deploy.region) {
    process.env.AWS_DEFAULT_REGION = config.deploy.region;
  }
}

// Test AWS credentials
function testAwsCredentials(profile = null) {
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
      console.error('❌ Error: AWS credentials are not configured or invalid');
      console.log('Please configure AWS credentials using one of these methods:');
      console.log('1. AWS CLI: aws configure');
      console.log('2. Environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
      console.log('3. IAM roles (for EC2/Lambda)');
      console.log('4. Update rswf.config.js with your credentials');
    }
    process.exit(1);
  }
}

// Get content type based on file extension
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  const contentTypes = {
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.svg': 'image/svg+xml',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.eot': 'application/vnd.ms-fontobject'
  };
  
  return contentTypes[ext] || 'application/octet-stream';
}

// Check if file should be gzipped
function shouldGzipFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = getContentType(filePath);
  
  // Gzip text-based files
  const gzipExtensions = ['.html', '.htm', '.css', '.js', '.mjs', '.json', '.xml', '.txt', '.md', '.svg'];
  const gzipContentTypes = ['text/', 'application/javascript', 'application/json', 'application/xml', 'image/svg+xml'];
  
  return gzipExtensions.includes(ext) || gzipContentTypes.some(type => contentType.startsWith(type));
}

// Gzip a file and return the compressed file path
async function gzipFile(inputPath, outputPath) {
  try {
    const readStream = createReadStream(inputPath);
    const writeStream = createWriteStream(outputPath);
    const gzipStream = createGzip({ level: 9 }); // Maximum compression
    
    await pipeline(readStream, gzipStream, writeStream);
    return outputPath;
  } catch (error) {
    throw new Error(`Failed to gzip file ${inputPath}: ${error.message}`);
  }
}

// Upload a single file with proper content-type and compression
async function uploadFileWithMetadata(filePath, bucketName, bucketKey, profile = null) {
  const contentType = getContentType(filePath);
  const shouldGzip = shouldGzipFile(filePath);
  
  let uploadPath = filePath;
  let contentEncoding = '';
  
  try {
    // Gzip the file if it should be compressed
    if (shouldGzip) {
      const gzipPath = `${filePath}.gz`;
      await gzipFile(filePath, gzipPath);
      uploadPath = gzipPath;
      contentEncoding = 'gzip';
    }
    
    // Build the AWS CLI arguments array exactly like the working test
    const awsArgs = [];
    
    // Add profile if specified (must come first)
    if (profile) {
      awsArgs.push('--profile', profile);
    }
    
    // Add the command
    awsArgs.push('s3api', 'put-object');
    
    // Add the main parameters
    awsArgs.push(
      '--bucket', bucketName,
      '--key', bucketKey,
      '--body', uploadPath,
      '--content-type', contentType
    );
    
    // Add content-encoding if file is gzipped
    if (contentEncoding) {
      awsArgs.push('--content-encoding', contentEncoding);
    }
    
    // Add cache control based on file type
    let cacheControl;
    if (bucketKey.includes('/assets/') && (bucketKey.includes('-') || bucketKey.includes('.'))) {
      cacheControl = 'public, max-age=31536000, immutable';
    } else if (bucketKey.endsWith('.html') || bucketKey === 'index.html') {
      cacheControl = 'public, max-age=3600';
    } else {
      cacheControl = 'public, max-age=86400';
    }
    awsArgs.push('--cache-control', cacheControl);
    
    // Execute using spawnSync with argument array (no shell parsing issues)
    const result = spawnSync('aws', awsArgs, {
      stdio: 'pipe',
      windowsHide: true
    });
    
    if (result.error) {
      throw new Error(`AWS CLI execution failed: ${result.error.message}`);
    }
    
    if (result.status !== 0) {
      const stderr = result.stderr.toString();
      const stdout = result.stdout.toString();
      throw new Error(`AWS CLI failed with status ${result.status}:\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`);
    }
    
    // Clean up gzipped file
    if (shouldGzip && fs.existsSync(uploadPath)) {
      fs.unlinkSync(uploadPath);
    }
    
    return { success: true, contentType, gzipped: shouldGzip };
  } catch (error) {
    // Clean up gzipped file on error
    if (shouldGzip && fs.existsSync(uploadPath)) {
      try {
        fs.unlinkSync(uploadPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
    throw error;
  }
}

// Get all files recursively from a directory
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  
  return arrayOfFiles;
}

// Upload files with content-type headers and gzip compression (parallel)
async function uploadFiles(config, profile = null) {
  const { bucketName, options = {} } = config.deploy;
  const distPath = path.join(rootDir, 'dist');
  
  console.log('📤 Uploading files with content-type headers and compression...');
  
  // Get all files to upload
  const allFiles = getAllFiles(distPath);
  const totalFiles = allFiles.length;
  
  console.log(`📋 Found ${totalFiles} files to upload`);
  
  // Create upload tasks
  const uploadTasks = allFiles.map(filePath => {
    const relativePath = path.relative(distPath, filePath);
    const bucketKey = relativePath.replace(/\\\\/g, '/'); // Convert Windows paths to S3 format
    
    return async () => {
      try {
        const result = await uploadFileWithMetadata(filePath, bucketName, bucketKey, profile);
        return { success: true, filePath, bucketKey, gzipped: result.gzipped };
      } catch (error) {
        console.error(`❌ Failed to upload ${filePath}:`, error.message);
        throw error;
      }
    };
  });
  
  // Execute uploads in parallel with concurrency limit
  const concurrencyLimit = 10; // Upload up to 10 files simultaneously
  const results = [];
  
  for (let i = 0; i < uploadTasks.length; i += concurrencyLimit) {
    const batch = uploadTasks.slice(i, i + concurrencyLimit);
    const batchPromises = batch.map(task => task());
    
    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Progress indicator
      console.log(`📤 Progress: ${results.length}/${totalFiles} files uploaded`);
    } catch (error) {
      console.error('❌ Batch upload failed:', error.message);
      throw error;
    }
  }
  
  const gzippedFiles = results.filter(r => r.gzipped).length;
  console.log(`✓ Successfully uploaded ${results.length} files (${gzippedFiles} with gzip compression)`);
}


// Set cache control headers for different file types
async function setCacheControlHeaders(config, profile = null) {
  const { bucketName, options = {} } = config.deploy;
  const { cacheControl } = options;
  
  if (!cacheControl) {
    console.log('ℹ️ No cache control settings found, skipping cache headers');
    return;
  }

  console.log('🔧 Setting cache control headers...');

  // Get list of files in the bucket
  try {
    const listCommand = buildAwsCommand(`s3api list-objects-v2 --bucket ${bucketName} --query "Contents[].Key" --output text`, profile);
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
      const cacheCommand = buildAwsCommand(`s3api copy-object --bucket ${bucketName} --copy-source ${bucketName}/${file} --key "${file}" --cache-control "${cacheControlValue}" --metadata-directive REPLACE`, profile);
      
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
async function invalidateCloudFront(config, profile = null) {
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

    const invalidationConfigPath = path.join(os.tmpdir(), 'invalidation-config.json');
    fs.writeFileSync(invalidationConfigPath, JSON.stringify(invalidationConfig));
    
    const command = buildAwsCommand(`cloudfront create-invalidation --distribution-id ${cloudfront.distributionId} --invalidation-batch file://${invalidationConfigPath} --output json`, profile);
    const result = execSync(command, { encoding: 'utf8' });
    const response = JSON.parse(result);
    
    const invalidationId = response.Invalidation.Id;
    console.log(`✓ CloudFront invalidation created: ${invalidationId}`);
    console.log(`📋 Invalidated paths: ${allPaths.join(', ')}`);
    
    // Clean up temp file
    try {
      fs.unlinkSync(invalidationConfigPath);
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
    
    // Get AWS profile from config
    const awsProfile = config.deploy.aws?.profile;

    // Pre-deployment checks
    checkAwsCli();
    checkDistDirectory();
    setupAwsEnvironment(config);
    testAwsCredentials(awsProfile);

    // Upload files with content-type headers and gzip compression
    console.log('📤 Uploading files to S3...');
    if (awsProfile) {
      console.log(`🔑 Using AWS profile: ${awsProfile}`);
    }

    await uploadFiles(config, awsProfile);

    // Set cache control headers
    await setCacheControlHeaders(config, awsProfile);

    // Invalidate CloudFront cache
    await invalidateCloudFront(config, awsProfile);

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