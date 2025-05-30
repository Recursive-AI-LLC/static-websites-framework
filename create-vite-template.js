// scaffold.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import readline from 'node:readline';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Configuration
const projectName = 'template-project'; // Default name
const files = [
  // Configuration files
  {
    path: 'package.json',
    content: `{
  "name": "test-website-2",
  "version": "1.0.0",
  "main": "postcss.config.js",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "description": "",
  "dependencies": {
    "@tailwindcss/postcss": "^4.1.6",
    "alpinejs": "^3.14.9",
    "handlebars": "^4.7.8",
    "postcss": "^8.5.3",
	"autoprefixer": "^10.4.21",
    "tailwindcss": "^4.1.6",
    "vite": "^6.3.5"
  }
}
`
  },
  {
    path: 'vite.config.js',
    content: `import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

// Get all HTML files in the pages directory
const pages = fs.readdirSync('./src/pages')
 .filter(file => file.endsWith('.html'))
 .reduce((obj, file) => {
   const name = file.replace('.html', '');
   obj[name] = resolve(__dirname, 'src/pages', file);
   return obj;
 }, {});

export default defineConfig({
 plugins: [
 ],
 build: {
   rollupOptions: {
	 input: {
	   main: resolve(__dirname, 'index.html'),
	   ...pages
	 }
   }
 }
});`
  },
  {
    path: 'tailwind.config.js',
    content: `/** @type {import('tailwindcss').Config} */

export default {
    content: [
        "./index.html",
        "./src/**/*.{html,js}",
    ],
    theme: {
        extend: {},
    },
    plugins: [],
}`
  },
  {
    path: 'postcss.config.js',
    content: `export default {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
}`
  },
  
  // HTML Files
  {
    path: 'index.html',
    content: `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Home</title>
    <link rel="stylesheet" href="/src/css/style.css">
</head>

<body>
    <div id="app"></div>
    <script type="module" src="/src/js/main.js"></script>
</body>

</html>`
  },
  {
    path: 'src/pages/home.html',
    content: `<div class="min-h-screen flex flex-col">
    {{> header title="Welcome to Our Website" }}

    <main class="flex-grow container mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold mb-6">{{ title }}</h1>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {{> card
            title="Feature One"
            description="This is a description of feature one."
            buttonText="Learn More"
            }}

            {{> card
            title="Feature Two"
            description="This is a description of feature two."
            buttonText="Get Started"
            }}

            {{> card
            title="Feature Three"
            description="This is a description of feature three."
            buttonText="Explore"
            }}
        </div>
    </main>

    {{> footer }}
</div>`
  },
  {
    path: 'src/pages/about.html',
    content: `<div class="min-h-screen flex flex-col">
    {{> header title="About Us" }}

    <main class="flex-grow container mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold mb-6">{{ title }}</h1>
        <p class="text-lg">This is the about page content.</p>
    </main>

    {{> footer }}
</div>`
  },
  {
    path: 'src/pages/contact.html',
    content: `<div class="min-h-screen flex flex-col">
    {{> header title="Contact Us" }}

    <main class="flex-grow container mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold mb-6">{{ title }}</h1>
        <p class="text-lg">This is the contact page content.</p>
    </main>

    {{> footer }}
</div>`
  },
  
  // Partials Files
  {
    path: 'src/partials/header.html',
    content: `<header class="bg-gray-800 text-white">
    <div class="container mx-auto px-4 py-6">
        <h1 class="text-2xl font-bold">{{ title }}</h1>
        {{> nav }}
    </div>
</header>`
  },
  {
    path: 'src/partials/footer.html',
    content: `<footer class="bg-gray-800 text-white py-8">
    <div class="container mx-auto px-4">
        <p>© 2023 Your Company. All rights reserved.</p>
    </div>
</footer>`
  },
  {
    path: 'src/partials/nav.html',
    content: `<nav class="mt-4">
    <ul class="flex space-x-6">
        <li><a href="/" class="hover:text-blue-300">Home</a></li>
        <li><a href="/about.html" class="hover:text-blue-300">About</a></li>
        <li><a href="/contact.html" class="hover:text-blue-300">Contact</a></li>
    </ul>
</nav>`
  },
  
  // Component Files
  {
    path: 'src/components/button.html',
	content: `<button class="px-4 py-2 rounded transition-colors" :class="{ 
  'bg-blue-600 hover:bg-blue-700 text-white': '{{ type }}' === 'primary',
  'bg-gray-200 hover:bg-gray-300 text-gray-800': '{{ type }}' === 'secondary'
}">
    {{ text }}
</button>`
  },
  {
    path: 'src/components/card.html',
	content: `<div class="bg-white shadow-md rounded-lg overflow-hidden" x-data="{ hover: false }" @mouseenter="hover = true"
    @mouseleave="hover = false">
    <div class="p-6">
        <h3 class="text-xl font-semibold mb-2">{{ title }}</h3>
        <p class="text-gray-600">{{ description }}</p>

        <div class="mt-4">
            {{> button
            text=buttonText
            type="primary"
            }}
        </div>
    </div>
</div>`
  },
  
  // CSS Files
  {
    path: 'src/css/style.css',
    content: `@import "tailwindcss";

/* Your custom styles below */`
  },
  
  // JS Files
  {
	  path: 'src/js/main.js',
	  content: `import Alpine from 'alpinejs';
import { registerAllPartials, renderTemplate } from './template-engine.js';

// Make Alpine available globally
window.Alpine = Alpine;

// Initialize Alpine
Alpine.start();

// Initialize the template engine
async function initTemplates() {
    // Register all partials first
    await registerAllPartials();

    // Get the current page path
    const pagePath = window.location.pathname;

    // Determine which template to load based on the path
    // This is a simple routing mechanism
    let templatePath;
    let pageData = {};

    if (pagePath === '/' || pagePath === '/index.html') {
        templatePath = '/src/pages/home.html';
        pageData = { title: 'Home Page' };
    } else {
        // Extract page name from path
        const pageName = pagePath.split('/').pop().replace('.html', '');
        templatePath = \`/src/pages/\${pageName}.html\`;
        pageData = { title: pageName.charAt(0).toUpperCase() + pageName.slice(1) };
    }

    // Render the page template
    await renderTemplate('#app', templatePath, pageData);
}

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', initTemplates);`
  },
    {
    path: 'src/js/template-engine.js',
	content: `import Handlebars from 'handlebars';

   // Cache for templates
   const templateCache = {};
   const partialsRegistered = new Set();

   // Register a partial
   export async function registerPartial(name, path) {
     if (partialsRegistered.has(name)) return;
     
     try {
       const response = await fetch(path);
       const partialTemplate = await response.text();
       Handlebars.registerPartial(name, partialTemplate);
       partialsRegistered.add(name);
     } catch (error) {
       console.error(\`Failed to load partial \${name} from \${path}:\`, error);
     }
   }

   // Load and cache a template
   export async function loadTemplate(path) {
     if (templateCache[path]) {
       return templateCache[path];
     }

     try {
       const response = await fetch(path);
       const templateText = await response.text();
       const template = Handlebars.compile(templateText);
       templateCache[path] = template;
       return template;
     } catch (error) {
       console.error(\`Failed to load template from \${path}:\`, error);
       return null;
     }
   }

   // Render a template with data
   export async function renderTemplate(elementSelector, templatePath, data = {}) {
     const targetElement = document.querySelector(elementSelector);
     if (!targetElement) {
       console.error(\`Target element not found: \${elementSelector}\`);
       return;
     }

     const template = await loadTemplate(templatePath);
     if (template) {
       targetElement.innerHTML = template(data);
     }
   }

   // Helper to register all partials in a directory
   export async function registerAllPartials() {
     // This would typically load from a configuration or scan a directory
     // For simplicity, we'll manually list partials here
     const partials = [
       { name: 'header', path: '/src/partials/header.html' },
       { name: 'footer', path: '/src/partials/footer.html' },
       { name: 'nav', path: '/src/partials/nav.html' }
     ];

     // Components are also registered as partials
     const components = [
       { name: 'card', path: '/src/components/card.html' },
       { name: 'button', path: '/src/components/button.html' }
     ];

     const registrationPromises = [
       ...partials.map(p => registerPartial(p.name, p.path)),
       ...components.map(c => registerPartial(c.name, c.path))
     ];

     await Promise.all(registrationPromises);
   }`
  },
  
  // Data Files
  {
    path: 'src/data/global.json',
    content: `{
  "siteName": "My Template Site",
  "navigation": [
    { "label": "Home", "url": "/" },
    { "label": "About", "url": "/about" },
    { "label": "Contact", "url": "/contact" }
  ]
}`
  },
  {
    path: 'src/data/index.json',
    content: `{
  "pageTitle": "Home",
  "featuredItems": [
    {
      "title": "Feature One",
      "description": "Description of feature one goes here."
    },
    {
      "title": "Feature Two",
      "description": "Description of feature two goes here."
    },
    {
      "title": "Feature Three",
      "description": "Description of feature three goes here."
    }
  ]
}`
  },
  {
    path: 'src/data/about.json',
    content: `{
  "pageTitle": "About"
}`
  },
  {
    path: 'src/data/contact.json',
    content: `{
  "pageTitle": "Contact"
}`
  }
];

// Function to create directory recursively
const createDirectory = (dirPath) => {
  const parts = dirPath.split(path.sep);
  let currentPath = '';
  
  for (const part of parts) {
    currentPath = currentPath ? path.join(currentPath, part) : part;
    if (!fs.existsSync(currentPath)) {
      fs.mkdirSync(currentPath);
      console.log(`Created directory: ${currentPath}`);
    }
  }
};

// Function to create a file
const createFile = (filePath, content) => {
  // Ensure the directory exists
  const dirPath = path.dirname(filePath);
  createDirectory(dirPath);
  
  // Write the file
  fs.writeFileSync(filePath, content);
  console.log(`Created file: ${filePath}`);
};

// Main function to create the project
const createProject = async (targetDir, force = false) => {
  const projectDir = path.resolve(process.cwd(), targetDir);
  
  // Check if directory exists and is not empty
  if (fs.existsSync(projectDir)) {
    const dirContents = fs.readdirSync(projectDir);
    if (dirContents.length > 0 && !force) {
      const answer = await question(`Directory ${projectDir} is not empty. Do you want to continue anyway? (y/N): `);
      if (answer.toLowerCase() !== 'y') {
        console.log('Operation cancelled.');
        rl.close();
        return;
      }
    }
  } else {
    // Create project directory
    fs.mkdirSync(projectDir, { recursive: true });
    console.log(`Created project directory: ${projectDir}`);
  }
  
  // Create all files
  for (const file of files) {
    const filePath = path.join(projectDir, file.path);
    createFile(filePath, file.content);
  }
  
  console.log('\nProject scaffold created successfully!');
  console.log('\nNext steps:');
  console.log(`1. cd ${targetDir}`);
  console.log('2. npm install');
  console.log('3. npm run dev');
  
  rl.close();
};

// Run the script with optional name parameter
const run = async (providedName = null) => {
  try {
    console.log('🚀 Vite + Tailwind + Alpine.js Template Generator 🚀\n');
    
    let targetDir;
    
    if (providedName) {
      // Use the provided name if available
      targetDir = providedName.trim() || 'template-project';
    } else {
      // Otherwise ask for input
      const projectName = await question('Enter project name (default: template-project): ');
      targetDir = projectName.trim() || 'template-project';
    }
    
    await createProject(targetDir);
  } catch (error) {
    console.error('Error creating project:', error);
    rl.close();
  }
};

const args = process.argv.slice(2); // First two arguments are node and script path
const commandLineProjectName = args[0]; // First actual argument would be the project name

run(commandLineProjectName);