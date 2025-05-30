import Alpine from 'alpinejs';

// Make Alpine available globally
window.Alpine = Alpine;

// Initialize Alpine
Alpine.start();

// Development-only code - this entire block gets eliminated in production builds
if (import.meta.env.DEV) {
  // Dynamic import ensures template-engine.js isn't bundled in production
  import('./dev/template-engine.js').then(({ initTemplates }) => {
    // Initialize when the DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initTemplates);
    } else {
      initTemplates();
    }
  }).catch(error => {
    console.error('Failed to load development template engine:', error);
  });
} else {
  console.log('Production mode: Alpine.js initialized for static content enhancement');
}