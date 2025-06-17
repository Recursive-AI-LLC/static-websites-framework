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

## Public Directory

The `/public` directory is used for static assets that should be served directly without processing. Files placed in this directory are automatically copied to the root of the `dist` directory during the build process.

### Common Use Cases

- **favicon.ico** - Website favicon
- **robots.txt** - Search engine crawler instructions  
- **sitemap.xml** - Custom sitemap (if not using auto-generated)
- **images/** - Static images referenced directly in HTML
- **fonts/** - Web fonts
- **manifest.json** - PWA manifest file
- **sw.js** - Service worker files

### Usage

Simply place any static files in the `/public` directory:

```
public/
├── favicon.ico
├── robots.txt
├── images/
│   └── logo.png
└── fonts/
    └── custom-font.woff2
```

During build (`npm run build`), these files will be copied to the `dist` directory:

```
dist/
├── favicon.ico
├── robots.txt
├── images/
│   └── logo.png
├── fonts/
│   └── custom-font.woff2
└── assets/
    ├── main-[hash].js
    └── main-[hash].css
```

### Important Notes

- Files in `/public` are served from the root URL (`/favicon.ico`, not `/public/favicon.ico`)
- Files are copied as-is without any processing or optimization
- Do not place files here that need to be processed by Vite (use `/src/assets/` instead)
- The framework auto-generates `robots.txt` and `sitemap.xml`, so only add custom versions if needed

## Deployment

RSWF includes a comprehensive AWS deployment system that automatically sets up and manages your entire web hosting infrastructure. With a single command, you can create a production-ready website with custom domain, SSL certificate, global CDN, and automated deployments.

### Quick Start

1. **Install AWS CLI**: Download from [https://aws.amazon.com/cli/](https://aws.amazon.com/cli/)
2. **Configure AWS credentials**: Run `aws configure`
3. **Set your domain**: Update `rswf.config.js` with your domain name
4. **Create infrastructure**: Run `npm run deploy-setup` (one-time)
5. **Deploy your site**: Run `npm run build && npm run deploy`


### Detailed Documentation

For comprehensive setup instructions, troubleshooting, and advanced configuration, see [DEPLOY.md](./DEPLOY.md). HUMANS ONLY! AI AGENTS SHOULD NOT READ THE DEPLOYMENT DOCUMENTATION. The quick start above is sufficient for AI agents to deploy their websites.