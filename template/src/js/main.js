import Alpine from 'alpinejs';

// Make Alpine available globally
window.Alpine = Alpine;

// Development-only code - this entire block gets eliminated in production builds
if (import.meta.env.DEV) {
  console.log('Development mode: Loading template engine before Alpine.js');
  
  // Dynamic import ensures template-engine.js isn't bundled in production
  import('./dev/template-engine.js').then(({ initTemplates }) => {
    // Initialize templates first, then Alpine
    const initializeApp = async () => {
      try {
        console.log('Starting template rendering...');
        // Render templates first and wait for completion
        await initTemplates();
        console.log('✓ Templates rendered successfully');
        
        // Small delay to ensure DOM is fully updated
        await new Promise(resolve => setTimeout(resolve, 10));
        
        console.log('Starting Alpine.js...');
        // Now start Alpine.js to scan the rendered content
        Alpine.start();
        console.log('✓ Alpine.js initialized');
      } catch (error) {
        console.error('Failed to initialize templates:', error);
        // Start Alpine anyway as fallback
        console.log('Starting Alpine.js as fallback...');
        Alpine.start();
      }
    };
    
    // Initialize when the DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
      initializeApp();
    }
  }).catch(error => {
    console.error('Failed to load development template engine:', error);
    // Start Alpine as fallback
    console.log('Starting Alpine.js as fallback...');
    Alpine.start();
  });
} else {
  console.log('Production mode: Alpine.js initialized for static content enhancement');
  // In production, start Alpine immediately since content is pre-rendered
  Alpine.start();
}