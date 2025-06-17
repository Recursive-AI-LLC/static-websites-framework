import Handlebars from 'handlebars';

   // Cache for templates
   const templateCache = {};
   const partialsRegistered = new Set();

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

   // Register a partial
   export async function registerPartial(name, path) {
     if (partialsRegistered.has(name)) return;
     
     try {
       const response = await fetch(path);
       if (!response.ok) {
         throw new Error(`HTTP ${response.status}: ${response.statusText}`);
       }
       const partialTemplate = await response.text();
       Handlebars.registerPartial(name, partialTemplate);
       partialsRegistered.add(name);
     } catch (error) {
       console.error(`Failed to load partial ${name} from ${path}:`, error);
       throw error; // Re-throw so registerAllPartials can handle it appropriately
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
       console.error(`Failed to load template from ${path}:`, error);
       return null;
     }
   }

   // Load JSON data file
   async function loadJsonData(path) {
     try {
       const response = await fetch(path);
       if (!response.ok) {
         console.warn(`Could not load data file ${path}:`, response.statusText);
         return {};
       }
       return await response.json();
     } catch (error) {
       console.warn(`Failed to load JSON data from ${path}:`, error);
       return {};
     }
   }

   // Render a template with data
   export async function renderTemplate(elementSelector, templatePath, data = {}) {
     const targetElement = document.querySelector(elementSelector);
     if (!targetElement) {
       console.error(`Target element not found: ${elementSelector}`);
       return;
     }

     const template = await loadTemplate(templatePath);
     if (template) {
       targetElement.innerHTML = template(data);
     }
   }

   // Helper to register all partials in a directory
   export async function registerAllPartials() {
     // TRUE dynamic discovery using Vite's import.meta.glob()
     // This scans the components directory at build time and finds all .html files
     const componentModules = import.meta.glob('/src/components/*.html', { 
       as: 'raw',
       eager: false 
     });

     // Extract component names and register each one
     const registrationPromises = Object.keys(componentModules).map(async (componentPath) => {
       // Extract component name from path: '/src/components/header.html' -> 'header'
       const componentName = componentPath.replace('/src/components/', '').replace('.html', '');
       
       try {
         // Load the component content using the glob module
         const componentContent = await componentModules[componentPath]();
         
         // Register the partial with Handlebars
         Handlebars.registerPartial(componentName, componentContent);
         partialsRegistered.add(componentName);
         
         console.log(`✓ Registered component: ${componentName}`);
       } catch (error) {
         console.error(`Failed to register component ${componentName}:`, error);
       }
     });

     await Promise.all(registrationPromises);
     console.log(`Dynamic component registration complete - found ${Object.keys(componentModules).length} components`);
   }

   // Initialize the template engine for development
   export async function initTemplates() {
     console.log('Initializing development template engine...');
     
     try {
       // Register Handlebars helpers first
       registerHelpers();
       
       // Register all partials
       await registerAllPartials();

       // Load global data
       const globalData = await loadJsonData('/src/data/global.json');

       // Get the current page path
       const pagePath = window.location.pathname;

        // Determine which template and data to load based on the path
        let templatePath;
        let pageName;

        if (pagePath === '/' || pagePath === '/index.html') {
            // Try index.html first, then fall back to home.html
            templatePath = '/src/pages/index.html';
            pageName = 'index';
            
            // Check if index.html exists, if not try home.html
            try {
                const response = await fetch(templatePath);
                if (!response.ok) {
                    console.log('index.html not found, falling back to home.html');
                    templatePath = '/src/pages/home.html';
                    pageName = 'home';
                }
            } catch (error) {
                console.log('index.html not accessible, falling back to home.html');
                templatePath = '/src/pages/home.html';
                pageName = 'home';
            }
        } else {
            // Extract page name from path
            pageName = pagePath.split('/').pop().replace('.html', '');
            templatePath = `/src/pages/${pageName}.html`;
        }
       
       console.log(`Loading template: ${templatePath} with data: ${pageName}.json`);
       
       // Load page-specific data
       const pageData = await loadJsonData(`/src/data/${pageName}.json`);

       // Merge global and page data (same as production build)
       const templateData = { ...globalData, ...pageData };

       // Render the page template and wait for completion
       await renderTemplate('#app', templatePath, templateData);
       
       console.log('✓ Template rendering complete');
       
       // Ensure DOM has been updated
       await new Promise(resolve => requestAnimationFrame(resolve));
       
     } catch (error) {
       console.error('Template initialization failed:', error);
       throw error; // Re-throw so main.js can handle the error
     }
   }