/**
 * RSWF Configuration File
 * 
 * This file contains configuration settings for the Recursive Static Website Framework.
 * Copy this file and update the values according to your deployment requirements.
 */

export default {
  // AWS S3 Deployment Configuration
  deploy: {
    // Domain name for your website (required for infrastructure setup)
    domain: 'example.com',
    
    // S3 bucket name where the site will be deployed (defaults to domain name)
    bucketName: 'example.com',
    
    // AWS region where your S3 bucket is located
    region: 'us-east-1',
    
    // AWS credentials (optional - can also use AWS CLI profiles or environment variables)
    // It's recommended to use AWS CLI profiles or environment variables instead of hardcoding credentials
    aws: {
      // Uncomment and set these if not using AWS CLI profiles or environment variables
      // accessKeyId: 'your-access-key-id',
      // secretAccessKey: 'your-secret-access-key',
      
      // AWS CLI profile to use (optional)
      profile: 'default'
    },
    
    // CloudFront configuration (auto-populated by deploy-setup script)
    cloudfront: {
      // distributionId: 'E1234567890', // Auto-populated by setup script
      autoInvalidate: true,              // Automatically invalidate cache on deploy
      // invalidatePaths: ['/custom/*']  // Custom paths to invalidate (optional)
    },
    
    // Deployment options
    options: {
      // Delete files in S3 that don't exist locally (sync behavior)
      deleteRemoved: true,
      
      // Set cache control headers for different file types
      cacheControl: {
        // HTML files - no cache to ensure updates are seen immediately
        'text/html': 'no-cache, no-store, must-revalidate',
        
        // CSS and JS files - cache for 1 year (use versioning/hashing for updates)
        'text/css': 'public, max-age=31536000, immutable',
        'application/javascript': 'public, max-age=31536000, immutable',
        
        // Images - cache for 1 month
        'image/*': 'public, max-age=2592000',
        
        // Default for other files
        'default': 'public, max-age=86400'
      },
      
      // Additional AWS CLI sync options
      exclude: [
        // Exclude common development files
        '.DS_Store',
        'Thumbs.db',
        '*.log'
      ]
    }
  },
  
  // Build configuration (for future use)
  build: {
    // Output directory
    outputDir: 'dist',
    
    // Base URL for the site (useful for CDN deployments)
    baseUrl: '/'
  }
};