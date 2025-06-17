# Recursive Static Website Framework (RSWF)

The Recursive Static Website Fraweork is a static website framework built on Vite, Tailwind CSS, and Alpine JS, leveraging Handlebars for templating. It is an opinionated framework that is optimized for use with Recursive AI Bots.

## General Principles

The Recursive Static Website Framework (RSWF) is built on seven core principles that guide its architecture and design decisions:

### 1. Dual-Environment Consistency
RSWF maintains strict consistency between development and production environments. The development environment uses Vite with browser-based Handlebars compilation, while production uses "npm run build" to generate static HTML files in the /dist folder through a build process. Despite different compilation methods, both environments produce identical HTML output, ensuring what you see in development is exactly what you get in production.

### 2. AI-First Design Philosophy
This framework is specifically optimized for AI agents building websites. Every aspect - from clear file structure to predictable templating patterns - is designed to be easily understood and manipulated by AI systems. Documentation is practical and example-driven, making it simple for AI agents to generate functional websites quickly.

### 3. Static Site Generation Benefits
RSWF embraces static site generation for maximum performance, security, and reliability. Static sites load faster, are more secure (no server-side vulnerabilities), cost less to host, and scale effortlessly. The framework generates clean URLs, optimized assets, and comprehensive SEO files automatically.

### 4. Developer Experience Priorities
The framework prioritizes simplicity and clarity over complexity. Hot module replacement in development, automatic asset optimization, clean separation of concerns, and intuitive file organization ensure a smooth development experience. AI agents can focus on content and functionality rather than build configuration.

### 5. SEO and Performance Principles
Every page automatically generates proper meta tags, Open Graph data, Twitter cards, and structured data. The build process creates sitemaps, robots.txt, and optimized assets. Performance is built-in through static generation, asset optimization, and minimal runtime JavaScript.

### 6. Maintainability and Simplicity
RSWF follows the principle of "convention over configuration." Clear file naming conventions, predictable data flow, and minimal boilerplate reduce cognitive load. The framework avoids unnecessary complexity while providing powerful templating capabilities through Handlebars.

### 7. Framework Extensibility
While opinionated in its core structure, RSWF is designed for extensibility. Custom Handlebars helpers can be added consistently across both environments. The component system allows for reusable UI elements. The data system supports flexible content management while maintaining type safety through required properties.

## File Structure:

 - src/
    - components/
        - Place all components in this directory.
    - css/
        - style.css - imports tailwindcss. Also, place default styles here
        - place additional stylesheets in this directory
    - data/
        - global.json - default site properties
        - [page].json - page properties for the [page].html webpage
    - js/
        - main.js - the default javascript module for the Alpine app.
    - pages/
        - The directory where you'll put all the individual pages for the website.


## Pages

Each page of the website needs its own .html file in the src/pages/ directory.
Example home.html
```html
<div class="min-h-screen flex flex-col">
    {{> header title="Welcome to Our Website" }}

    <main class="flex-grow container mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold mb-6">{{ title }}</h1>
        
        <div class="mt-4">
            {{> button
            text=buttonText
            type="primary"
            onClick="alert('Button clicked!')"
            }}
        </div>
    </main>

    {{> footer }}
</div>
```

During the build process, each page's content will be embedded within the following template:
```javascript
  return `<!DOCTYPE html>
<html lang="en">
<head>
    ${metaTags}
    ${assetPaths.css ? `<link rel="stylesheet" href="${assetPaths.css}">` : ''}
    <style>
        /* Prevent flash of unstyled content */
        [x-cloak] { display: none !important; }
    </style>
</head>
<body>
    <div id="app">
        ${content}
    </div>
    ${assetPaths.js ? `<script type="module" src="${assetPaths.js}"></script>` : ''}
</body>
</html>`;
```


## Data

A src/data/global.json data file contains the default properties of the website. The global.json file MUST exist and MUST have all of the properties that are in the example below.
Then, each page of the website MUST have a corresponding JSON file in the src/data/ directory. 

```json
Example global.json
{
  "siteName": "My Template Site",
  "description": "A modern website built with Alpine.js, Tailwind CSS, and Vite",
  "author": "Your Name",
  "baseUrl": "https://example.com",
  "defaultImage": "/assets/og-image.jpg"
}
```

Example home.json
```json
{
  "title": "Home",
  "description": "Welcome to our modern website built with Alpine.js, Tailwind CSS, and Vite. Fast, responsive, and SEO-friendly.",
  "keywords": "Alpine.js, Tailwind CSS, Vite, modern web development, responsive design",
  "url": "/",
  "buttonText": "Hello World!"
}
```

Properties of the page data json:
 - title: (required) used for page title and sitemap - defaults to global siteName
 - description: (required) used for meta description tag / open graph / twitter / sitemap
 - url: (required) canonical url / open graph
 - keywords: (optional) meta keywords tag
 - image: (optional) open graph image - defaults to global defaultImage
    
You can pass in any additional data needed into the page data json. 
        
        
## Components

Components go in the src/components/ directory.
Any content that is repeated often should be a component.
Navigation, header, and footer are very often components for webpages.

**Example button component:**
```html
<button class="px-4 py-2 rounded transition-colors" :class="{ 
  'bg-blue-600 hover:bg-blue-700 text-white': '{{ type }}' === 'primary',
  'bg-gray-200 hover:bg-gray-300 text-gray-800': '{{ type }}' === 'secondary'
}">
    {{ text }}
</button>
```

**Example button component usage:**
```html
<div class="mt-4">
    {{> button
    text="Test Button"
    type="primary"
    onClick="alert('Button clicked!')"
    }}
</div>
```

**Example footer component:**
```html
<footer class="bg-gray-800 text-white py-8">
    <div class="container mx-auto px-4">
        <p>© 2025 Your Company. All rights reserved.</p>
    </div>
</footer>
```

## Deployment

RSWF includes a comprehensive AWS deployment system that automatically sets up and manages your entire web hosting infrastructure. With a single command, you can create a production-ready website with custom domain, SSL certificate, global CDN, and automated deployments.

### Quick Start

1. **Install AWS CLI**: Download from [https://aws.amazon.com/cli/](https://aws.amazon.com/cli/)
2. **Configure AWS credentials**: Run `aws configure`
3. **Set your domain**: Update `rswf.config.js` with your domain name
4. **Create infrastructure**: Run `npm run deploy-setup` (one-time)
5. **Deploy your site**: Run `npm run build && npm run deploy`

Your site will be live at `https://yourdomain.com` with SSL and global CDN!

### Prerequisites

1. **AWS CLI v2**: Install from [https://aws.amazon.com/cli/](https://aws.amazon.com/cli/)
2. **AWS Account**: You need an AWS account with appropriate permissions
3. **Domain Name**: You must own a domain name for your website
4. **Domain Registrar Access**: To update nameservers (one-time setup)

### Configuration

Create a `rswf.config.js` file in your project root:

```javascript
export default {
  deploy: {
    // Your domain name (required for infrastructure setup)
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
    
    // CloudFront configuration (auto-populated by setup script)
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

### Infrastructure Setup (One-Time)

The setup script creates your complete AWS infrastructure:

```bash
npm run deploy-setup
```

**What this creates:**
- **Route53 Hosted Zone**: DNS management for your domain
- **S3 Bucket**: Static website hosting with versioning
- **CloudFront Distribution**: Global CDN with custom domain
- **SSL Certificate**: Free HTTPS certificate via AWS Certificate Manager
- **DNS Records**: Automatic domain pointing to CloudFront

**For subdomains** (e.g., `blog.example.com`): The script intelligently uses your existing root domain's hosted zone.

**After setup**: Update your domain registrar's nameservers with the provided AWS nameservers (one-time, 24-48 hour propagation).

### Ongoing Deployment

Deploy updates to your live site:

```bash
# Build and deploy
npm run build && npm run deploy

# Or separately
npm run build
npm run deploy
```

**What deployment does:**
- Uploads changed files to S3
- Sets optimal cache headers
- Automatically invalidates CloudFront cache
- Provides live site URL

### AWS Authentication

Multiple authentication methods supported:

1. **AWS CLI Profile** (Recommended):
   ```bash
   aws configure --profile myprofile
   ```

2. **Environment Variables**:
   ```bash
   export AWS_ACCESS_KEY_ID=your-access-key
   export AWS_SECRET_ACCESS_KEY=your-secret-key
   export AWS_DEFAULT_REGION=us-east-1
   ```

3. **IAM Roles**: Automatic when running on AWS infrastructure

### Advanced Features

- **Smart Cache Invalidation**: Only invalidates HTML files and unversioned assets
- **Asset Versioning**: Leverages Vite's automatic asset versioning for optimal caching
- **Multi-Environment Support**: Easy staging/production configurations
- **Cost Optimization**: Intelligent caching reduces bandwidth costs
- **Global Performance**: CloudFront edge locations worldwide

### Estimated Costs

For typical small websites:
- **Route53**: $0.50/month (hosted zone)
- **S3**: $0.05/month (storage)
- **CloudFront**: $1.00/month (CDN)
- **SSL Certificate**: Free
- **Total**: ~$1.55/month

### Detailed Documentation

For comprehensive setup instructions, troubleshooting, and advanced configuration, see [DEPLOY.md](./DEPLOY.md).

### Deployment Features

- **One-Command Infrastructure**: Complete AWS setup with `npm run deploy-setup`
- **Automatic SSL**: Free HTTPS certificates with auto-renewal
- **Global CDN**: CloudFront distribution for worldwide performance
- **Smart Caching**: Optimized cache behaviors for different file types
- **Cache Invalidation**: Automatic CloudFront cache busting on deploy
- **Clean URLs**: SEO-friendly URL structure maintained
- **Domain Management**: Handles both root domains and subdomains
- **Error Handling**: Comprehensive validation and clear error messages
- **Cost Efficient**: Optimized for minimal AWS costs