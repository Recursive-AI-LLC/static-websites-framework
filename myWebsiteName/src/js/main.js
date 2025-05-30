import Alpine from 'alpinejs';
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
        templatePath = `/src/pages/${pageName}.html`;
        pageData = { title: pageName.charAt(0).toUpperCase() + pageName.slice(1) };
    }

    // Render the page template
    await renderTemplate('#app', templatePath, pageData);
}

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', initTemplates);