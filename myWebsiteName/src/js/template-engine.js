import Handlebars from 'handlebars';

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
       console.error(`Failed to load partial ${name} from ${path}:`, error);
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
     // This would typically load from a configuration or scan a directory
     // For simplicity, we'll manually list partials here
     const partials = [
       { name: 'header', path: '/src/components/header.html' },
       { name: 'footer', path: '/src/components/footer.html' },
       { name: 'nav', path: '/src/components/nav.html' }
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
   }