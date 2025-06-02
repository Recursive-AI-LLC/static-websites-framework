import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🚀 Starting static site generation...');

// Configuration
const config = {
  srcDir: path.join(rootDir, 'src'),
  distDir: path.join(rootDir, 'dist'),
  pagesDir: path.join(rootDir, 'src/pages'),
  componentsDir: path.join(rootDir, 'src/components'),
  dataDir: path.join(rootDir, 'src/data'),
  assetsPath: '/assets' // This will be populated by Vite
};

// Utility functions
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`Warning: Could not read JSON file ${filePath}:`, error.message);
    return {};
  }
}

function readTemplateFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading template file ${filePath}:`, error.message);
    return '';
  }
}

// Register all Handlebars partials
function registerPartials() {
  const componentsDir = config.componentsDir;
  
  if (!fs.existsSync(componentsDir)) {
    console.warn('Components directory not found');
    return;
  }

  const componentFiles = fs.readdirSync(componentsDir).filter(file => file.endsWith('.html'));
  
  componentFiles.forEach(file => {
    const componentName = path.basename(file, '.html');
    const componentPath = path.join(componentsDir, file);
    const componentContent = readTemplateFile(componentPath);
    
    Handlebars.registerPartial(componentName, componentContent);
    console.log(`Registered partial: ${componentName}`);
  });
}


// Register Handlebars helpers
function registerHelpers() {
  // Helper for adding numbers (used in process steps, etc.)
  Handlebars.registerHelper('add', function(a, b) {
    return a + b;
  });
  
  // Helper for equality comparison
  Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
  });
  
  // Helper for checking if string contains substring
  Handlebars.registerHelper('contains', function(str, substring) {
    return str && str.includes(substring);
  });
  
  console.log('Registered Handlebars helpers: add, eq, contains');
}

// Generate SEO meta tags for a page
function generateMetaTags(pageData, globalData) {
  const siteName = globalData.siteName || 'My Website';
  const title = pageData.title ? `${pageData.title} | ${siteName}` : siteName;
  const description = pageData.description || globalData.description || 'Welcome to our website';
  const url = pageData.url || '';
  const image = pageData.image || globalData.defaultImage || '';

  return `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${url}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    ${image ? `<meta property="og:image" content="${image}">` : ''}
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${url}">
    <meta property="twitter:title" content="${title}">
    <meta property="twitter:description" content="${description}">
    ${image ? `<meta property="twitter:image" content="${image}">` : ''}
    
    <!-- Additional SEO -->
    <meta name="robots" content="index, follow">
    <meta name="author" content="${globalData.author || ''}">
    ${pageData.keywords ? `<meta name="keywords" content="${pageData.keywords}">` : ''}
    
    <!-- Canonical URL -->
    <link rel="canonical" href="${url}">
  `.trim();
}

// Create the base HTML template
function createBaseTemplate(metaTags, content, assetPaths) {
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
}

// Get asset paths from Vite manifest
function getAssetPaths() {
  const manifestPath = path.join(config.distDir, '.vite', 'manifest.json');
  
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const entry = manifest['src/js/main.js'] || manifest['main.js'] || {};
      
      return {
        js: entry.file ? `/${entry.file}` : null,
        css: entry.css && entry.css[0] ? `/${entry.css[0]}` : null
      };
    } catch (error) {
      console.warn('Could not read Vite manifest:', error.message);
    }
  }
  
  // Fallback: try to find assets in dist/assets
  const assetsDir = path.join(config.distDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    const jsFile = files.find(f => f.startsWith('main-') && f.endsWith('.js'));
    const cssFile = files.find(f => f.startsWith('main-') && f.endsWith('.css'));
    
    return {
      js: jsFile ? `/assets/${jsFile}` : null,
      css: cssFile ? `/assets/${cssFile}` : null
    };
  }
  
  return { js: null, css: null };
}

// Build individual page
function buildPage(pageName, pageTemplate, pageData, globalData, assetPaths) {
  try {
    // Compile the template
    const template = Handlebars.compile(pageTemplate);
    
    // Merge page data with global data
    const templateData = { ...globalData, ...pageData };
    
    // Render the page content
    const pageContent = template(templateData);
    
    // Generate meta tags
    const metaTags = generateMetaTags(pageData, globalData);
    
    // Create the complete HTML
    const fullHtml = createBaseTemplate(metaTags, pageContent, assetPaths);
    
    // Determine output path
    let outputPath;
    if (pageName === 'home' || pageName === 'index') {
      outputPath = path.join(config.distDir, 'index.html');
    } else {
      // Create clean URLs: /about/ instead of /about.html
      const pageDir = path.join(config.distDir, pageName);
      ensureDir(pageDir);
      outputPath = path.join(pageDir, 'index.html');
    }
    
    // Write the file
    fs.writeFileSync(outputPath, fullHtml);
    console.log(`✓ Built page: ${pageName} -> ${outputPath}`);
    
    return {
      name: pageName,
      url: pageName === 'home' || pageName === 'index' ? '/' : `/${pageName}/`,
      title: pageData.title,
      description: pageData.description
    };
  } catch (error) {
    console.error(`Error building page ${pageName}:`, error.message);
    return null;
  }
}

// Generate sitemap.xml
function generateSitemap(pages, globalData) {
  const baseUrl = globalData.baseUrl || 'https://example.com';
  
  const urls = pages.map(page => `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${page.url === '/' ? '1.0' : '0.8'}</priority>
  </url>`).join('');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  const sitemapPath = path.join(config.distDir, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemap);
  console.log('✓ Generated sitemap.xml');
}

// Generate robots.txt
function generateRobotsTxt(globalData) {
  const baseUrl = globalData.baseUrl || 'https://example.com';
  
  const robots = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml`;

  const robotsPath = path.join(config.distDir, 'robots.txt');
  fs.writeFileSync(robotsPath, robots);
  console.log('✓ Generated robots.txt');
}

// Clean up unnecessary files from dist
function cleanupDistFiles() {
  // Remove the src/pages directory from dist as it's not needed in production
  const srcPagesDir = path.join(config.distDir, 'src');
  if (fs.existsSync(srcPagesDir)) {
    fs.rmSync(srcPagesDir, { recursive: true, force: true });
    console.log('✓ Cleaned up unnecessary template files from dist');
  }
}

// Main build function
async function buildStaticSite() {
  // Ensure dist directory exists
  ensureDir(config.distDir);
  
  // Register Handlebars partials
  registerPartials();
  
  // Register Handlebars helpers
  registerHelpers();
  
  // Load global data
  const globalDataPath = path.join(config.dataDir, 'global.json');
  const globalData = readJsonFile(globalDataPath);
  
  // Get asset paths from Vite build
  const assetPaths = getAssetPaths();
  console.log('Asset paths:', assetPaths);
  
  // Find all page templates
  const pagesDir = config.pagesDir;
  if (!fs.existsSync(pagesDir)) {
    console.error('Pages directory not found!');
    return;
  }
  
  const pageFiles = fs.readdirSync(pagesDir).filter(file => file.endsWith('.html'));
  const builtPages = [];
  
  // Build each page
  for (const pageFile of pageFiles) {
    const pageName = path.basename(pageFile, '.html');
    const pageTemplatePath = path.join(pagesDir, pageFile);
    const pageDataPath = path.join(config.dataDir, `${pageName}.json`);
    
    // Load page template
    const pageTemplate = readTemplateFile(pageTemplatePath);
    
    // Load page-specific data
    const pageData = readJsonFile(pageDataPath);
    
    // Build the page
    const builtPage = buildPage(pageName, pageTemplate, pageData, globalData, assetPaths);
    if (builtPage) {
      builtPages.push(builtPage);
    }
  }
  
  // Generate sitemap and robots.txt
  generateSitemap(builtPages, globalData);
  generateRobotsTxt(globalData);
  
  // Clean up unnecessary files
  cleanupDistFiles();
  
  console.log(`✅ Static site generation complete! Built ${builtPages.length} pages.`);
  console.log('Pages built:', builtPages.map(p => p.url).join(', '));
}

// Execute the build
buildStaticSite().catch(console.error);