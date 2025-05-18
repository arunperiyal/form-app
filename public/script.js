document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('mainForm');
  const progressBar = document.getElementById('progressBar');
  const progressBarContainer = document.getElementById('progressBarContainer');
  const formSuccess = document.createElement('div');
  formSuccess.className = 'form-success';
  formSuccess.id = 'formSuccess';
  formSuccess.setAttribute('role', 'alert');
  formSuccess.setAttribute('aria-live', 'assertive');
  formSuccess.textContent = 'Form submitted successfully!';
  form.parentNode.appendChild(formSuccess);

  // Track form completion progress
  function updateFormProgress() {
    const requiredFields = form.querySelectorAll('[required]');
    const totalRequired = requiredFields.length;
    let completed = 0;
    
    requiredFields.forEach(field => {
      if (field.type === 'radio') {
        // Only count radio groups once
        if (!field.dataset.counted) {
          const name = field.name;
          const radioGroup = form.querySelectorAll(`input[name="${name}"]`);
          const isChecked = Array.from(radioGroup).some(r => r.checked);
          if (isChecked) completed++;
          
          // Mark all radios in this group as counted
          radioGroup.forEach(r => r.dataset.counted = true);
        }
      } else if (field.type === 'checkbox') {
        // For required checkbox groups
        if (field.validity.valid) completed++;
      } else {
        // Regular inputs
        if (field.validity.valid && field.value.trim() !== '') completed++;
      }
    });
    
    // Reset the counting flag
    form.querySelectorAll('[data-counted]').forEach(el => delete el.dataset.counted);
    
    // Update progress bar if there are required fields
    if (totalRequired > 0) {
      const percentage = Math.round((completed / totalRequired) * 100);
      progressBar.style.width = `${percentage}%`;
      progressBarContainer.style.display = 'block';
      progressBarContainer.setAttribute('aria-valuenow', percentage);
      progressBarContainer.setAttribute('aria-label', `Form completion: ${percentage}%`);
    }
  }

  // Load saved data from localStorage
  const loadSavedData = () => {
    const fields = ['shortAnswer', 'longAnswer', 'dropdown', 'date', 'time', 'phone', 'email', 'number', 'website'];
    fields.forEach(field => {
      const saved = localStorage.getItem(field);
      if (saved) document.getElementById(field).value = saved;
    });

    // Restore radio buttons and checkboxes
    const radioFields = ['singleSelect', 'scale'];
    radioFields.forEach(field => {
      const saved = localStorage.getItem(field);
      if (saved) {
        const radio = document.querySelector(`input[name="${field}"][value="${saved}"]`);
        if (radio) radio.checked = true;
      }
    });

    // Restore checkboxes
    const savedCheckboxes = localStorage.getItem('multiSelect');
    if (savedCheckboxes) {
      try {
        const checkboxValues = JSON.parse(savedCheckboxes);
        checkboxValues.forEach(value => {
          const checkbox = document.querySelector(`input[name="multiSelect[]"][value="${value}"]`);
          if (checkbox) checkbox.checked = true;
        });
      } catch (e) {
        console.error('Error restoring checkboxes:', e);
      }
    }

    // Validate all fields after loading saved data
    validateAllFields();
    updateFormProgress();
  };

  // Initial load of saved data
  loadSavedData();

  // Add debounce function for input handlers
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Save form data on input with debouncing
  const saveFormData = debounce((e) => {
    const { name, value, type, checked } = e.target;
    
    // Don't save file inputs
    if (type === 'file') return;
    
    // Handle different input types
    if (type === 'checkbox') {
      // For checkboxes, we need to store multiple values
      if (name === 'multiSelect[]') {
        const checkboxes = Array.from(document.querySelectorAll('input[name="multiSelect[]"]:checked'));
        const values = checkboxes.map(cb => cb.value);
        localStorage.setItem('multiSelect', JSON.stringify(values));
      }
    } else if (type === 'radio') {
      // Store radio button selection
      const fieldName = name;
      localStorage.setItem(fieldName, value);
    } else if (name) {
      // Store text field values
      localStorage.setItem(name, value);
    }
    
    // Update progress after saving
    updateFormProgress();
  }, 300);

  // Add input event listener with debounce
  form.addEventListener('input', (e) => {
    validateField(e.target);
    saveFormData(e);
  });

  // Function to validate a specific field
  function validateField(field) {
    // Skip validation for non-field elements
    if (!field.name) return true;
    
    const error = field.parentElement.querySelector('.error-message');
    if (!error) return true;
    
    // Special validation for file inputs
    if (field.type === 'file' && field.files.length > 0) {
      const file = field.files[0];
      const fileType = file.type;
      const fileSize = file.size;
      
      // Check file type (PDF, JPG, PNG)
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      const isValidType = validTypes.includes(fileType);
      
      // Check file size (max 1MB)
      const isValidSize = fileSize <= 1048576; // 1MB in bytes
      
      if (!isValidType || !isValidSize) {
        error.style.display = 'block';
        field.classList.add('invalid');
        
        if (!isValidType) {
          error.textContent = 'File must be PDF, JPG, or PNG.';
        } else {
          error.textContent = 'File must be under 1MB.';
        }
        
        return false;
      }
    }
    
    // Regular validation using the Constraint Validation API
    if (field.validity.valid) {
      error.style.display = 'none';
      field.classList.remove('invalid');
      return true;
    } else {
      error.style.display = 'block';
      field.classList.add('invalid');
      
      // Custom error messages
      if (field.validity.valueMissing) {
        error.textContent = 'This field is required.';
      } else if (field.validity.typeMismatch) {
        if (field.type === 'email') {
          error.textContent = 'Please enter a valid email address.';
        } else if (field.type === 'url') {
          error.textContent = 'Please enter a valid URL (including http:// or https://).';
        }
      } else if (field.validity.patternMismatch) {
        if (field.id === 'phone') {
          error.textContent = 'Enter a valid phone number (10–15 digits).';
        } else if (field.id === 'shortAnswer') {
          error.textContent = 'At least 3 characters required.';
        }
      } else if (field.validity.rangeUnderflow) {
        error.textContent = `Value must be at least ${field.min}.`;
      } else if (field.validity.rangeOverflow) {
        error.textContent = `Value must be at most ${field.max}.`;
      }
      
      return false;
    }
  }

  // Validate radio button groups
  function validateRadioGroup(name) {
    const radios = document.querySelectorAll(`input[name="${name}"]`);
    const error = document.querySelector(`input[name="${name}"]`)
                   ?.closest('.form-group, fieldset')
                   ?.querySelector('.error-message');
    
    if (!error) return true;
    
    const isChecked = Array.from(radios).some(r => r.checked);
    if (!isChecked && radios[0].required) {
      error.style.display = 'block';
      return false;
    } else {
      error.style.display = 'none';
      return true;
    }
  }

  // Validate all form fields
  function validateAllFields() {
    let isValid = true;
    
    // Validate text inputs, selects, etc.
    form.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]), textarea, select').forEach(el => {
      if (!validateField(el) && el.required) isValid = false;
    });
    
    // Validate radio groups
    ['singleSelect', 'scale'].forEach(name => {
      if (!validateRadioGroup(name)) isValid = false;
    });
    
    return isValid;
  }

  // Clear form data with confirmation
  window.clearForm = function() {
    if (confirm('Are you sure you want to clear all form data? This cannot be undone.')) {
      localStorage.clear();
      form.reset();
      validateAllFields();
      updateFormProgress();
      alert('Form data cleared successfully.');
    }
  };

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const isValid = validateAllFields();
    if (!isValid) {
      // Find the first invalid field and focus it
      const firstInvalid = form.querySelector('.invalid');
      if (firstInvalid) {
        firstInvalid.focus();
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Show progress bar animation
    progressBarContainer.style.display = 'block';
    progressBar.style.width = '0%';
    progressBar.style.transition = 'width 1s ease';
    setTimeout(() => {
      progressBar.style.width = '100%';
    }, 100);

    // Disable submit button to prevent double submission
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    try {
      // Create FormData object
      const formData = new FormData(form);
      
      // Collect checkbox values (they need special handling)
      const checkboxes = document.querySelectorAll('input[name="multiSelect[]"]:checked');
      formData.delete('multiSelect[]'); // Remove the default entries
      checkboxes.forEach(checkbox => {
        formData.append('multiSelect', checkbox.value);
      });

      // Add timestamp to form submission
      formData.append('submitted_at', new Date().toISOString());

      // Send the form data to the server
      const response = await fetch('/submit-form', {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type when using FormData
          // Browser will set it with proper boundary
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      // Check for successful submission
      if (response.ok) {
        const data = await response.json();
        
        // Show success message
        formSuccess.style.display = 'block';
        formSuccess.textContent = data.message || 'Form submitted successfully!';
        
        // Clear form data
        localStorage.clear();
        form.reset();
        updateFormProgress();
        
        // Scroll to the success message
        formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Hide success message after 5 seconds
        setTimeout(() => {
          formSuccess.style.display = 'none';
        }, 5000);
      } else {
        // Handle server errors
        const errorData = await response.json().catch(() => ({
          message: 'Server error. Please try again later.'
        }));
        
        throw new Error(errorData.message);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      alert('Error: ' + (error.message || 'There was an error submitting the form. Please try again.'));
    } finally {
      // Re-enable submit button
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
      
      // Hide progress bar
      setTimeout(() => {
        progressBarContainer.style.display = 'none';
        progressBar.style.transition = 'none';
      }, 1000);
    }
  });
  
  // Initial form progress update
  updateFormProgress();
  
  // Add form field tooltips for better UX
  const addTooltip = (element, message) => {
    if (!element) return;
    element.setAttribute('title', message);
    element.setAttribute('data-tooltip', message);
  };
  
  // Add tooltips to key elements
  addTooltip(document.getElementById('shortAnswer'), 'Enter at least 3 characters');
  addTooltip(document.getElementById('email'), 'Enter a valid email like example@domain.com');
  addTooltip(document.getElementById('phone'), 'Enter a phone number with 10-15 digits');
  addTooltip(document.getElementById('upload'), 'Accepted formats: PDF, JPG, PNG. Max size: 1MB');
});
