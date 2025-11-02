// Enhanced Form Script with Modern Features

class FormManager {
  constructor(formId) {
    this.form = document.getElementById(formId);
    this.submitBtn = document.getElementById('submitBtn');
    this.clearDraftBtn = document.getElementById('clearDraftBtn');
    this.draftStatus = document.getElementById('draftStatus');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.successMessage = document.getElementById('successMessage');
    this.toastContainer = document.getElementById('toastContainer');
    
    this.draftKey = 'formDraft_' + formId;
    this.autoSaveTimeout = null;
    
    this.init();
  }

  init() {
    // Load saved draft
    this.loadDraft();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Initial progress update
    this.updateProgress();
    
    // Setup character counters
    this.setupCharacterCounters();
    
    // Setup file upload
    this.setupFileUpload();
  }

  setupEventListeners() {
    // Form submission
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Auto-save on input
    this.form.addEventListener('input', () => {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = setTimeout(() => this.saveDraft(), 1000);
      this.updateProgress();
    });
    
    // Real-time validation
    this.form.querySelectorAll('input, textarea, select').forEach(field => {
      field.addEventListener('blur', () => this.validateField(field));
      field.addEventListener('input', () => {
        if (field.classList.contains('error')) {
          this.validateField(field);
        }
      });
    });
    
    // Clear draft button
    this.clearDraftBtn.addEventListener('click', () => this.clearDraft());
    
    // Submit another button
    const submitAnotherBtn = document.getElementById('submitAnotherBtn');
    if (submitAnotherBtn) {
      submitAnotherBtn.addEventListener('click', () => this.resetForm());
    }
  }

  setupCharacterCounters() {
    const fieldsWithCounter = [
      { id: 'shortAnswer', max: 500 },
      { id: 'longAnswer', max: 5000 }
    ];

    fieldsWithCounter.forEach(({ id, max }) => {
      const field = document.getElementById(id);
      const counter = document.getElementById(id + 'Counter');
      
      if (field && counter) {
        field.addEventListener('input', () => {
          const length = field.value.length;
          counter.textContent = `${length} / ${max}`;
          
          // Color coding
          counter.classList.remove('warning', 'danger');
          if (length > max * 0.9) {
            counter.classList.add('danger');
          } else if (length > max * 0.7) {
            counter.classList.add('warning');
          }
        });
        
        // Initial count
        field.dispatchEvent(new Event('input'));
      }
    });
  }

  setupFileUpload() {
    const fileInput = document.getElementById('upload');
    const filePreview = document.getElementById('filePreview');
    const fileLabel = document.querySelector('.file-upload-label');

    if (!fileInput) return;

    // Drag and drop
    fileLabel.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileLabel.style.borderColor = 'var(--primary-color)';
      fileLabel.style.background = 'rgba(79, 70, 229, 0.05)';
    });

    fileLabel.addEventListener('dragleave', () => {
      fileLabel.style.borderColor = '';
      fileLabel.style.background = '';
    });

    fileLabel.addEventListener('drop', (e) => {
      e.preventDefault();
      fileLabel.style.borderColor = '';
      fileLabel.style.background = '';
      
      if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        this.updateFilePreview(fileInput.files[0]);
      }
    });

    // File selection
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) {
        this.updateFilePreview(fileInput.files[0]);
      }
    });
  }

  updateFilePreview(file) {
    const filePreview = document.getElementById('filePreview');
    const errorEl = document.getElementById('uploadError');
    
    // Validate file size
    const maxSize = 1024 * 1024; // 1MB
    if (file.size > maxSize) {
      this.showError(errorEl, 'File size must be less than 1MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      this.showError(errorEl, 'Only PDF, JPG, and PNG files are allowed');
      return;
    }

    // Clear error
    this.hideError(errorEl);

    // Show preview
    const sizeInKB = (file.size / 1024).toFixed(2);
    filePreview.innerHTML = `
      <span class="file-preview-name">📄 ${file.name}</span>
      <span class="file-preview-size">${sizeInKB} KB</span>
      <button type="button" class="file-preview-remove" onclick="formManager.removeFile()">×</button>
    `;
    filePreview.classList.add('show');
  }

  removeFile() {
    const fileInput = document.getElementById('upload');
    const filePreview = document.getElementById('filePreview');
    
    fileInput.value = '';
    filePreview.classList.remove('show');
    filePreview.innerHTML = '';
  }

  validateField(field) {
    const errorEl = document.getElementById(field.id + 'Error');
    if (!errorEl) return true;

    // Check validity
    if (!field.checkValidity()) {
      const message = this.getErrorMessage(field);
      this.showError(errorEl, message);
      field.classList.add('error');
      return false;
    } else {
      this.hideError(errorEl);
      field.classList.remove('error');
      return true;
    }
  }

  getErrorMessage(field) {
    if (field.validity.valueMissing) {
      return 'This field is required';
    }
    if (field.validity.typeMismatch) {
      if (field.type === 'email') return 'Please enter a valid email address';
      if (field.type === 'url') return 'Please enter a valid URL';
      return 'Please enter a valid value';
    }
    if (field.validity.patternMismatch) {
      if (field.type === 'tel') return 'Please enter a valid phone number';
      return 'Please match the requested format';
    }
    if (field.validity.tooShort) {
      return `Minimum length is ${field.minLength} characters`;
    }
    if (field.validity.tooLong) {
      return `Maximum length is ${field.maxLength} characters`;
    }
    if (field.validity.rangeUnderflow) {
      return `Value must be at least ${field.min}`;
    }
    if (field.validity.rangeOverflow) {
      return `Value must be at most ${field.max}`;
    }
    return 'Please enter a valid value';
  }

  showError(errorEl, message) {
    errorEl.textContent = message;
    errorEl.classList.add('show');
  }

  hideError(errorEl) {
    errorEl.textContent = '';
    errorEl.classList.remove('show');
  }

  updateProgress() {
    const requiredFields = this.form.querySelectorAll('[required]');
    let completed = 0;
    let total = 0;

    // Count unique required fields
    const countedRadios = new Set();
    
    requiredFields.forEach(field => {
      if (field.type === 'radio') {
        if (!countedRadios.has(field.name)) {
          countedRadios.add(field.name);
          total++;
          const checked = this.form.querySelector(`input[name="${field.name}"]:checked`);
          if (checked) completed++;
        }
      } else {
        total++;
        if (field.checkValidity() && field.value.trim() !== '') {
          completed++;
        }
      }
    });

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    this.progressFill.style.width = `${percentage}%`;
    this.progressText.textContent = `${percentage}% Complete`;
  }

  saveDraft() {
    const formData = new FormData(this.form);
    const data = {};
    
    formData.forEach((value, key) => {
      if (data[key]) {
        if (Array.isArray(data[key])) {
          data[key].push(value);
        } else {
          data[key] = [data[key], value];
        }
      } else {
        data[key] = value;
      }
    });

    localStorage.setItem(this.draftKey, JSON.stringify(data));
    this.showDraftStatus('Draft saved');
  }

  loadDraft() {
    const draft = localStorage.getItem(this.draftKey);
    if (!draft) return;

    try {
      const data = JSON.parse(draft);
      
      Object.keys(data).forEach(key => {
        const field = this.form.elements[key];
        if (!field) return;

        if (field.type === 'checkbox') {
          const values = Array.isArray(data[key]) ? data[key] : [data[key]];
          this.form.querySelectorAll(`input[name="${key}"]`).forEach(checkbox => {
            checkbox.checked = values.includes(checkbox.value);
          });
        } else if (field.type === 'radio') {
          const radio = this.form.querySelector(`input[name="${key}"][value="${data[key]}"]`);
          if (radio) radio.checked = true;
        } else {
          field.value = data[key];
        }
      });

      this.showDraftStatus('Draft loaded');
      this.updateProgress();
      
      // Trigger input events for character counters
      this.form.querySelectorAll('input, textarea').forEach(field => {
        field.dispatchEvent(new Event('input'));
      });
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  }

  clearDraft() {
    if (confirm('Are you sure you want to clear the saved draft?')) {
      localStorage.removeItem(this.draftKey);
      this.form.reset();
      this.removeFile();
      this.updateProgress();
      this.showToast('Draft cleared', 'The saved draft has been removed', 'info');
      this.draftStatus.classList.remove('show');
    }
  }

  showDraftStatus(message) {
    const draftText = document.getElementById('draftText');
    draftText.textContent = message;
    this.draftStatus.classList.add('show');
    
    setTimeout(() => {
      this.draftStatus.classList.remove('show');
    }, 3000);
  }

  async handleSubmit(e) {
    e.preventDefault();

    // Validate all fields
    let isValid = true;
    this.form.querySelectorAll('input, textarea, select').forEach(field => {
      if (!this.validateField(field) && field.hasAttribute('required')) {
        isValid = false;
      }
    });

    if (!isValid) {
      this.showToast('Validation Error', 'Please fix the errors before submitting', 'error');
      return;
    }

    // Show loading state
    this.submitBtn.classList.add('loading');
    this.submitBtn.disabled = true;
    this.form.classList.add('loading');

    try {
      const formData = new FormData(this.form);
      
      const response = await fetch('/submit-form', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        // Clear draft
        localStorage.removeItem(this.draftKey);
        
        // Show success message
        this.form.style.display = 'none';
        this.successMessage.classList.add('show');
        
        // Show toast
        this.showToast('Success!', 'Your form has been submitted successfully', 'success');
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error(result.message || 'Submission failed');
      }
    } catch (error) {
      console.error('Submission error:', error);
      this.showToast('Submission Failed', error.message || 'Please try again later', 'error');
    } finally {
      this.submitBtn.classList.remove('loading');
      this.submitBtn.disabled = false;
      this.form.classList.remove('loading');
    }
  }

  resetForm() {
    this.form.reset();
    this.form.style.display = 'block';
    this.successMessage.classList.remove('show');
    this.removeFile();
    this.updateProgress();
    
    // Clear all error states
    this.form.querySelectorAll('.error-message').forEach(el => {
      el.classList.remove('show');
    });
    
    this.form.querySelectorAll('.error').forEach(el => {
      el.classList.remove('error');
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showToast(title, message, type = 'info') {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close">×</button>
    `;

    this.toastContainer.appendChild(toast);

    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });

    // Auto remove after 5 seconds
    setTimeout(() => {
      toast.style.animation = 'slideInRight 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }
}

// Initialize form manager when DOM is ready
let formManager;
document.addEventListener('DOMContentLoaded', () => {
  formManager = new FormManager('mainForm');
  
  // Show welcome toast
  setTimeout(() => {
    formManager.showToast(
      'Welcome!',
      'Your progress will be automatically saved as you fill out the form',
      'info'
    );
  }, 500);
});
