// Add this to fix form validation errors with flatpickr components
if (typeof document !== 'undefined') {
  // Run immediately without waiting for DOMContentLoaded
  (function() {
    // Fix for flatpickr inputs causing form validation errors
    const fixFlatpickrValidation = () => {
      const minuteInputs = document.querySelectorAll('.flatpickr-minute');
      const hourInputs = document.querySelectorAll('.flatpickr-hour');
      const numInputs = document.querySelectorAll('.numInput');
      
      // Fix all potential problematic inputs
      [...minuteInputs, ...hourInputs, ...numInputs].forEach(input => {
        if (input) {
          // Set name attribute if missing
          if (!input.getAttribute('name') || input.getAttribute('name') === '') {
            input.setAttribute('name', 'time-part-' + Math.random().toString(36).substring(2, 9));
          }
          
          // Ensure focusable
          input.setAttribute('tabindex', '0');
          
          // Remove validation requirements
          if (input.hasAttribute('required')) {
            input.removeAttribute('required');
          }
          
          // Disable form validation completely for this input
          input.setAttribute('formnovalidate', 'formnovalidate');
          
          // Add attribute to prevent focus trap
          input.setAttribute('data-form-excluded', 'true');
        }
      });
    };
    
    // Apply fix immediately
    fixFlatpickrValidation();
    
    // Apply again after a short delay to catch any dynamically created elements
    setTimeout(fixFlatpickrValidation, 100);
    setTimeout(fixFlatpickrValidation, 500);
    setTimeout(fixFlatpickrValidation, 1000);
    
    // Create MutationObserver to handle dynamically created flatpickr instances
    const observer = new MutationObserver((mutations) => {
      let hasRelevantChanges = false;
      
      mutations.forEach((mutation) => {
        // Check if mutation has added nodes
        if (mutation.addedNodes.length) {
          hasRelevantChanges = true;
        }
        
        // Check if the target itself or its descendants contain relevant elements
        if (mutation.target && (
          mutation.target.classList && 
          (mutation.target.classList.contains('flatpickr-calendar') || 
           mutation.target.classList.contains('flatpickr-time') ||
           mutation.target.classList.contains('numInput'))
        )) {
          hasRelevantChanges = true;
        }
      });
      
      if (hasRelevantChanges) {
        fixFlatpickrValidation();
      }
    });
    
    // Start observing document for flatpickr elements with more inclusive parameters
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['tabindex', 'name', 'required']
    });
    
    // Override form submission to fix validation issues with flatpickr
    document.addEventListener('submit', function(e) {
      // Find all form inputs that might cause validation issues
      const problematicInputs = e.target.querySelectorAll('.flatpickr-minute, .flatpickr-hour, .numInput');
      
      problematicInputs.forEach(input => {
        // Temporarily fix any validation issues right before submission
        if (!input.getAttribute('name') || input.getAttribute('name') === '') {
          input.setAttribute('name', 'time-part-' + Math.random().toString(36).substring(2, 9));
        }
        input.setAttribute('tabindex', '0');
      });
    }, true);
    
    // Apply fix when flatpickr opens or closes
    const origOpen = HTMLElement.prototype.appendChild;
    HTMLElement.prototype.appendChild = function() {
      const result = origOpen.apply(this, arguments);
      
      // If this element being appended is a flatpickr element
      if (arguments[0] && arguments[0].classList && 
          (arguments[0].classList.contains('flatpickr-calendar') || 
           this.classList && this.classList.contains('flatpickr-calendar'))) {
        // Apply our fix
        setTimeout(fixFlatpickrValidation, 0);
      }
      
      return result;
    };
  })();
} 