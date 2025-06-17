# RSWF AWS Deployment Guide

This guide provides comprehensive instructions for deploying your Recursive Static Website Framework (RSWF) site to AWS using the built-in automation tools.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Configuration](#configuration)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Deployment Process](#deployment-process)
5. [Domain Configuration](#domain-configuration)
6. [Troubleshooting](#troubleshooting)
7. [Cost Considerations](#cost-considerations)
8. [Best Practices](#best-practices)

## Prerequisites

### Required Tools

1. **AWS CLI v2**: Install from [https://aws.amazon.com/cli/](https://aws.amazon.com/cli/)
   ```bash
   # Verify installation
   aws --version
   ```

2. **AWS Account**: You need an active AWS account with appropriate permissions

3. **Domain Name**: You must own a domain name that you want to use for your website

### Required AWS Permissions

Your AWS user/role needs the following permissions:
- Route53: Full access (for DNS management)
- S3: Full access (for bucket creation and file uploads)
- CloudFront: Full access (for CDN distribution)
- ACM: Full access (for SSL certificates)
- IAM: Read access (for credential validation)

### AWS Credentials Setup

Choose one of these methods to configure AWS credentials:

#### Option 1: AWS CLI Configuration (Recommended)
```bash
aws configure
```
Enter your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., `us-east-1`)
- Default output format (e.g., `json`)

#### Option 2: AWS CLI Profiles
```bash
aws configure --profile myprofile
```

#### Option 3: Environment Variables
```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=us-east-1
```

#### Option 4: IAM Roles (for EC2/Lambda)
Automatic when running on AWS infrastructure with attached IAM roles.

## Configuration

### Create rswf.config.js

Create a `rswf.config.js` file in your project root:

```javascript
export default {
  deploy: {
    // Your domain name (required)
    domain: 'example.com',
    
    // S3 bucket name (defaults to domain name)
    bucketName: 'example.com',
    
    // AWS region for S3 bucket
    region: 'us-east-1',
    
    // AWS credentials (optional if using CLI/environment)
    aws: {
      // Use AWS CLI profile (recommended)
      profile: 'default',
      
      // Or direct credentials (not recommended for production)
      // accessKeyId: 'your-access-key-id',
      // secretAccessKey: 'your-secret-access-key'
    },
    
    // CloudFront configuration (auto-populated by setup)
    cloudfront: {
      // distributionId: 'E1234567890', // Auto-populated
      autoInvalidate: true,              // Auto-invalidate cache on deploy
      // invalidatePaths: ['/custom/*']  // Custom invalidation paths
    },
    
    // Deployment options
    options: {
      // Sync behavior - delete files not in local build
      deleteRemoved: true,
      
      // Cache control headers for optimal performance
      cacheControl: {
        'text/html': 'no-cache, no-store, must-revalidate',
        'text/css': 'public, max-age=31536000, immutable',
        'application/javascript': 'public, max-age=31536000, immutable',
        'image/*': 'public, max-age=2592000',
        'default': 'public, max-age=86400'
      },
      
      // Files to exclude from upload
      exclude: ['.DS_Store', 'Thumbs.db', '*.log']
    }
  }
};
```

### Configuration Options Explained

#### Domain Configuration
- **Root Domain**: `example.com` - Creates bucket `example.com`, handles both `example.com` and `www.example.com`
- **Subdomain**: `blog.example.com` - Creates bucket `blog.example.com`, uses existing root domain hosted zone

#### AWS Region
- **us-east-1**: Recommended for global sites (required for CloudFront SSL certificates)
- **Other regions**: Choose based on your primary audience location

## Infrastructure Setup

### One-Time Setup Process

Run the infrastructure setup command to create all AWS resources:

```bash
npm run deploy-setup
```

### What the Setup Script Does

The setup script automatically creates and configures:

1. **Route53 Hosted Zone**
   - Creates hosted zone for root domain (if needed)
   - Uses existing hosted zone for subdomains
   - Displays nameservers for domain registrar configuration

2. **S3 Bucket**
   - Creates bucket with domain name
   - Configures static website hosting
   - Disables public access block
   - Sets public read policy
   - Enables versioning

3. **SSL Certificate**
   - Requests ACM certificate for domain (+ www variant)
   - Automatically creates DNS validation records
   - Waits for certificate validation

4. **CloudFront Distribution**
   - Creates global CDN distribution
   - Configures custom domain with SSL
   - Sets intelligent caching behaviors:
     - HTML files: 1 hour cache
     - CSS/JS files: 1 year cache
     - Images: 1 month cache
   - Enables compression
   - Sets up custom error pages (404 → index.html)

5. **DNS Records**
   - Creates A records pointing to CloudFront
   - Handles both root domain and www subdomain

6. **Configuration Update**
   - Automatically adds CloudFront distribution ID to your config

### Expected Output

```
🚀 Starting AWS infrastructure setup for RSWF...
✓ Configuration valid - setting up infrastructure for: example.com
✓ AWS CLI is installed
✓ AWS credentials are valid

🏗️ Starting AWS infrastructure setup...
📍 Domain: example.com
📦 S3 Bucket: example.com
🌍 Region: us-east-1

1️⃣ Setting up Route53 hosted zone...
✓ Created hosted zone: Z1234567890ABC
📋 Nameservers for your domain registrar:
   ns-123.awsdns-12.com
   ns-456.awsdns-45.net
   ns-789.awsdns-78.org
   ns-012.awsdns-01.co.uk

2️⃣ Setting up S3 bucket...
📦 Creating S3 bucket: example.com...
🔓 Disabling public access block...
📚 Enabling versioning...
🌐 Configuring static website hosting...
📋 Setting bucket policy for public read...
✓ S3 bucket example.com configured successfully

3️⃣ Setting up SSL certificate...
🔒 Requesting SSL certificate for example.com...
✓ SSL certificate requested: arn:aws:acm:us-east-1:123456789:certificate/abc-123
⏳ Waiting for certificate validation records...
📝 Creating DNS validation records...
✓ DNS validation records created
⏳ Waiting for SSL certificate validation (this may take several minutes)...
✓ SSL certificate validated and issued

4️⃣ Setting up CloudFront distribution...
☁️ Creating CloudFront distribution...
✓ CloudFront distribution created: E1234567890
📡 Distribution domain: d123abc456def.cloudfront.net

5️⃣ Setting up DNS records...
📝 Creating DNS records...
✓ Created DNS record for example.com
✓ Created DNS record for www.example.com

✓ Updated rswf.config.js with CloudFront distribution ID

🎉 AWS infrastructure setup completed successfully!

📋 Summary:
   🌐 Domain: example.com
   📦 S3 Bucket: example.com
   ☁️ CloudFront: E1234567890
   🔒 SSL Certificate: arn:aws:acm:us-east-1:123456789:certificate/abc-123
   📡 Hosted Zone: Z1234567890ABC (example.com)

⏳ Note: CloudFront distribution deployment may take 15-20 minutes to complete.
💡 You can now run "npm run build && npm run deploy" to upload your site!
🌐 Your site will be available at: https://example.com and https://www.example.com
```

## Deployment Process

### Build and Deploy Your Site

After infrastructure setup, deploy your site with:

```bash
# Build the static site
npm run build

# Deploy to AWS
npm run deploy
```

Or combine both steps:

```bash
npm run build && npm run deploy
```

### What the Deploy Script Does

1. **Validation**
   - Checks for rswf.config.js
   - Validates AWS CLI installation
   - Verifies AWS credentials
   - Confirms dist directory exists

2. **S3 Upload**
   - Syncs dist folder to S3 bucket
   - Applies cache control headers
   - Excludes specified file patterns
   - Shows upload progress

3. **CloudFront Invalidation**
   - Automatically invalidates changed content
   - Smart invalidation (only HTML and unversioned files)
   - Preserves Vite's asset versioning benefits

### Expected Deploy Output

```
🚀 Starting RSWF deployment...
✓ Configuration valid - deploying to bucket: example.com in region: us-east-1
✓ AWS CLI is installed
✓ Built site found in dist directory
✓ Using AWS profile: default
✓ AWS credentials are valid
📤 Uploading files to S3...
Command: aws s3 sync "dist" s3://example.com --delete --exclude ".DS_Store"
upload: dist/index.html to s3://example.com/index.html
upload: dist/assets/main-abc123.css to s3://example.com/assets/main-abc123.css
upload: dist/assets/main-def456.js to s3://example.com/assets/main-def456.js
✓ Files uploaded successfully
🔧 Setting cache control headers...
✓ Cache control headers set
🔄 Invalidating CloudFront cache...
✓ CloudFront invalidation created: I1234567890ABC
📋 Invalidated paths: /, /index.html, /*/, /robots.txt, /sitemap.xml
🎉 Deployment completed successfully!
🌐 Your site is now live at: https://example.com
⏳ CloudFront cache invalidation may take a few minutes to propagate
```

## Domain Configuration

### Nameserver Configuration

After running `deploy-setup`, you'll receive nameservers that need to be configured with your domain registrar:

1. **Log into your domain registrar** (GoDaddy, Namecheap, etc.)
2. **Find DNS/Nameserver settings** for your domain
3. **Replace existing nameservers** with the AWS nameservers provided
4. **Save changes** (propagation takes 24-48 hours)

### Subdomain Setup

For subdomains (e.g., `blog.example.com`):

1. **Root domain must already have Route53 hosted zone**
2. **Run setup with subdomain in config**: `domain: 'blog.example.com'`
3. **Script automatically uses existing root domain hosted zone**
4. **No additional nameserver configuration needed**

### SSL Certificate Validation

- **DNS validation is automatic** - the script creates required DNS records
- **Certificate validation takes 5-10 minutes** typically
- **Certificate covers both domain and www variant** for root domains
- **Certificates are automatically renewed by AWS**

## Troubleshooting

### Common Issues and Solutions

#### 1. AWS CLI Not Found
```
❌ Error: AWS CLI is not installed or not in PATH
```
**Solution**: Install AWS CLI v2 from [https://aws.amazon.com/cli/](https://aws.amazon.com/cli/)

#### 2. Invalid AWS Credentials
```
❌ Error: AWS credentials are not configured or invalid
```
**Solutions**:
- Run `aws configure` to set up credentials
- Check IAM permissions (Route53, S3, CloudFront, ACM access required)
- Verify access keys are active and not expired

#### 3. Domain Already Exists Error
```
❌ Error: Bucket already exists and is owned by another account
```
**Solutions**:
- Choose a different domain/bucket name
- Check if you already own the bucket in a different region
- Verify the domain name spelling

#### 4. Certificate Validation Timeout
```
❌ Timeout waiting for certificate validation
```
**Solutions**:
- Check DNS propagation (can take up to 48 hours)
- Verify nameservers are correctly configured with domain registrar
- Ensure Route53 hosted zone is properly set up

#### 5. CloudFront Distribution Creation Failed
```
❌ Failed to create CloudFront distribution
```
**Solutions**:
- Verify SSL certificate is in `us-east-1` region
- Check AWS service limits for CloudFront distributions
- Ensure domain name is valid and properly formatted

#### 6. Deploy Script Can't Find Distribution ID
```
ℹ️ No CloudFront distribution ID found, skipping cache invalidation
```
**Solutions**:
- Run `npm run deploy-setup` first to create infrastructure
- Manually add `distributionId` to your `rswf.config.js`
- Check that the setup script completed successfully

#### 7. S3 Sync Permission Denied
```
❌ Error: Access Denied when uploading to S3
```
**Solutions**:
- Verify S3 bucket permissions
- Check IAM user has S3 write permissions
- Ensure bucket name matches configuration

### Debug Mode

For detailed error information, you can run AWS CLI commands manually:

```bash
# Test AWS credentials
aws sts get-caller-identity

# List S3 buckets
aws s3 ls

# Check CloudFront distributions
aws cloudfront list-distributions

# Verify Route53 hosted zones
aws route53 list-hosted-zones
```

## Cost Considerations

### AWS Service Costs

#### Route53
- **Hosted Zone**: $0.50/month per hosted zone
- **DNS Queries**: $0.40 per million queries

#### S3
- **Storage**: ~$0.023/GB/month (Standard storage)
- **Requests**: $0.0004 per 1,000 PUT requests, $0.0004 per 10,000 GET requests
- **Data Transfer**: Free to CloudFront

#### CloudFront
- **Data Transfer**: $0.085/GB for first 10 TB/month (varies by region)
- **Requests**: $0.0075 per 10,000 HTTP requests
- **Invalidations**: First 1,000 per month free, then $0.005 per path

#### ACM (SSL Certificates)
- **Free** for certificates used with CloudFront

### Estimated Monthly Costs

For a typical small website (< 1GB storage, < 10GB transfer):
- **Route53**: $0.50
- **S3**: $0.05
- **CloudFront**: $1.00
- **ACM**: $0.00
- **Total**: ~$1.55/month

## Best Practices

### Security
- **Never commit AWS credentials** to version control
- **Use IAM roles** when possible instead of access keys
- **Enable MFA** on your AWS account
- **Regularly rotate access keys**

### Performance
- **Use Vite's asset versioning** (already configured)
- **Optimize images** before uploading
- **Monitor CloudFront cache hit rates**
- **Consider using WebP images** for better compression

### Deployment Workflow
1. **Test locally** with `npm run dev`
2. **Build and test** with `npm run build && npm run preview`
3. **Deploy to staging** environment first (if available)
4. **Deploy to production** with `npm run deploy`

### Monitoring
- **Set up CloudWatch alarms** for unusual traffic
- **Monitor AWS costs** in the billing dashboard
- **Check CloudFront logs** for performance insights
- **Use AWS Cost Explorer** to track spending trends

### Backup and Recovery
- **S3 versioning is enabled** by default (allows file recovery)
- **Export Route53 zone files** periodically
- **Document your infrastructure** setup process
- **Keep your rswf.config.js** in version control (without credentials)

### Domain Management
- **Set up domain auto-renewal** with your registrar
- **Monitor domain expiration dates**
- **Keep registrar contact information updated**
- **Consider domain privacy protection**

## Advanced Configuration

### Custom Cache Behaviors

You can customize CloudFront caching by modifying the cache control settings:

```javascript
// In rswf.config.js
options: {
  cacheControl: {
    // Never cache HTML files
    'text/html': 'no-cache, no-store, must-revalidate',
    
    // Cache CSS/JS for 1 year (Vite handles versioning)
    'text/css': 'public, max-age=31536000, immutable',
    'application/javascript': 'public, max-age=31536000, immutable',
    
    // Cache images for 1 month
    'image/*': 'public, max-age=2592000',
    
    // Cache other files for 1 day
    'default': 'public, max-age=86400'
  }
}
```

### Custom Invalidation Paths

Add custom paths to invalidate on each deployment:

```javascript
// In rswf.config.js
cloudfront: {
  autoInvalidate: true,
  invalidatePaths: [
    '/api/*',      // Invalidate API routes
    '/blog/*',     // Invalidate blog pages
    '/sitemap.xml' // Always invalidate sitemap
  ]
}
```

### Multiple Environments

For staging and production environments, create separate config files:

```javascript
// rswf.staging.config.js
export default {
  deploy: {
    domain: 'staging.example.com',
    bucketName: 'staging-example-com',
    // ... other staging settings
  }
};

// rswf.production.config.js
export default {
  deploy: {
    domain: 'example.com',
    bucketName: 'example.com',
    // ... other production settings
  }
};
```

Then use environment-specific commands:
```bash
# Deploy to staging
cp rswf.staging.config.js rswf.config.js && npm run deploy

# Deploy to production
cp rswf.production.config.js rswf.config.js && npm run deploy
```

---

## Support

If you encounter issues not covered in this guide:

1. **Check the AWS Console** for detailed error messages
2. **Review AWS CloudTrail logs** for API call details
3. **Consult AWS documentation** for service-specific issues
4. **Open an issue** in the RSWF repository with detailed error logs

Remember to **never share AWS credentials** or sensitive configuration details when seeking help.