// Home Dashboard Script

document.addEventListener('DOMContentLoaded', () => {
  // Fetch server health status
  fetchHealthStatus();
  
  // Update stats every 30 seconds
  setInterval(fetchHealthStatus, 30000);
});

async function fetchHealthStatus() {
  try {
    const response = await fetch('/health');
    const data = await response.json();
    
    if (data.status === 'healthy') {
      updateStats(data);
    }
  } catch (error) {
    console.error('Error fetching health status:', error);
    updateStatsError();
  }
}

function updateStats(data) {
  // Update uptime
  const uptimeEl = document.getElementById('statUptime');
  if (uptimeEl && data.uptime) {
    const uptime = formatUptime(data.uptime);
    uptimeEl.textContent = uptime;
  }
  
  // Update status
  const statusEl = document.getElementById('statStatus');
  if (statusEl) {
    statusEl.textContent = 'Healthy';
    statusEl.style.color = '#10b981';
  }
}

function updateStatsError() {
  const statusEl = document.getElementById('statStatus');
  if (statusEl) {
    statusEl.textContent = 'Unknown';
    statusEl.style.color = '#ef4444';
  }
  
  const uptimeEl = document.getElementById('statUptime');
  if (uptimeEl) {
    uptimeEl.textContent = 'N/A';
  }
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${Math.floor(seconds)}s`;
  }
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href !== '#' && href.length > 1) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }
  });
});

// Add active state to nav links on scroll
window.addEventListener('scroll', () => {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
  
  let current = '';
  
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    if (window.pageYOffset >= sectionTop - 100) {
      current = section.getAttribute('id');
    }
  });
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${current}`) {
      link.classList.add('active');
    }
  });
});

// Add scroll reveal animation
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

// Observe feature cards
document.querySelectorAll('.feature-card, .stat-card').forEach(card => {
  card.style.opacity = '0';
  card.style.transform = 'translateY(20px)';
  card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(card);
});

// Console welcome message
console.log('%c🎉 Welcome to Flexible Form System v2.2.0!', 'color: #4f46e5; font-size: 20px; font-weight: bold;');
console.log('%c✨ Production-ready with enterprise-grade security', 'color: #10b981; font-size: 14px;');
console.log('%cBuilt with: Node.js, Express, SQLite, Helmet, Winston, JWT', 'color: #6b7280; font-size: 12px;');
