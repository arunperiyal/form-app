document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('mainForm');
  const progressBar = document.getElementById('progressBar');
  const progressBarContainer = document.getElementById('progressBarContainer');
  const formSuccess = document.createElement('div');
  formSuccess.className = 'form-success';
  formSuccess.id = 'formSuccess';
  formSuccess.textContent = 'Form submitted successfully!';
  form.parentNode.appendChild(formSuccess);

  // Load saved data
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

  // Save form data on input
  form.addEventListener('input', (e) => {
    const { name, value, type, checked } = e.target;
    
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
    } else if (fields.includes(name)) {
      // Store text field values
      localStorage.setItem(name, value);
    }

    // Validate the field
    validateField(e.target);
  });

  // Function to validate a specific field
  function validateField(field) {
    const error = field.parentElement.querySelector('.error-message');
    if (!error) return;
    
    if (field.validity.valid) {
      error.style.display = 'none';
      field.classList.remove('invalid');
    } else {
      error.style.display = 'block';
      field.classList.add('invalid');
    }
  }

  // Validate radio button groups
  function validateRadioGroup(name) {
    const radios = document.querySelectorAll(`input[name="${name}"]`);
    const error = document.querySelector(`input[name="${name}"]`)
                   ?.closest('.form-group')
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
  function validateForm() {
    let isValid = true;
    
    // Validate text inputs, selects, etc.
    form.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]), textarea, select').forEach(el => {
      validateField(el);
      if (!el.validity.valid && el.required) isValid = false;
    });
    
    // Validate radio groups
    ['singleSelect', 'scale'].forEach(name => {
      if (!validateRadioGroup(name)) isValid = false;
    });
    
    return isValid;
  }

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const isValid = validateForm();
    if (!isValid) return;

    // Show progress bar
    progressBarContainer.style.display = 'block';
    progressBar.style.width = '0%';
    setTimeout(() => {
      progressBar.style.width = '100%';
    }, 100);

    try {
      // Create FormData object
      const formData = new FormData(form);
      
      // Collect checkbox values (they need special handling)
      const checkboxes = document.querySelectorAll('input[name="multiSelect[]"]:checked');
      formData.delete('multiSelect[]'); // Remove the default entries
      checkboxes.forEach(checkbox => {
        formData.append('multiSelect', checkbox.value);
      });

      // Send the form data to the server
      const response = await fetch('/submit-form', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        // Show success message
        formSuccess.style.display = 'block';
        
        // Clear form data
        localStorage.clear();
        form.reset();
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          formSuccess.style.display = 'none';
        }, 3000);
      } else {
        throw new Error('Server error');
      }
    } catch (error) {
      alert('There was an error submitting the form. Please try again.');
      console.error('Form submission error:', error);
    } finally {
      // Hide progress bar
      setTimeout(() => {
        progressBarContainer.style.display = 'none';
      }, 1000);
    }
  });
});

