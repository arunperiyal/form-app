document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('mainForm');
  const progressBar = document.getElementById('progressBar');
  const progressBarContainer = document.getElementById('progressBarContainer');

  // Load saved data
  const fields = ['shortAnswer', 'longAnswer', 'dropdown', 'date', 'time', 'phone', 'email', 'number', 'website', 'scale'];
  fields.forEach(field => {
    const saved = localStorage.getItem(field);
    if (saved) document.getElementById(field).value = saved;
  });

  form.addEventListener('input', (e) => {
    const { name, value } = e.target;
    if (fields.includes(name)) {
      localStorage.setItem(name, value);
    }

    const error = e.target.parentElement.querySelector('.error-message');
    if (error) {
      if (e.target.validity.valid) {
        error.style.display = 'none';
      } else {
        error.style.display = 'block';
      }
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    let isValid = form.checkValidity();
    form.querySelectorAll('input, textarea, select').forEach(el => {
      const error = el.parentElement.querySelector('.error-message');
      if (error) {
        error.style.display = el.validity.valid ? 'none' : 'block';
      }
    });

    if (!isValid) return;

    // Simulate progress
    progressBarContainer.style.display = 'block';
    progressBar.style.width = '0%';
    setTimeout(() => {
      progressBar.style.width = '100%';
    }, 100);

    // Simulate form submission
    setTimeout(() => {
      alert('Form submitted successfully!');
      localStorage.clear();
      form.reset();
      progressBarContainer.style.display = 'none';
    }, 1500);
  });
});

