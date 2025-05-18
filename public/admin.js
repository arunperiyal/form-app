// Global variables
let authToken = sessionStorage.getItem("authToken");

// Initialize the admin panel on page load
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is already authenticated
  if (authToken) {
    showAdminPanel();
    loadSubmissions(authToken);
  } else {
    showLoginScreen();
  }

  // Add event listener for Enter key on password field
  const passwordInput = document.getElementById("admin-password");
  if (passwordInput) {
    passwordInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        verifyPassword();
      }
    });
  }
});

// Function to verify admin password
function verifyPassword() {
  const password = document.getElementById("admin-password").value;
  const errorElement = document.getElementById("login-error");
  
  if (!password) {
    errorElement.textContent = "Please enter a password";
    errorElement.style.display = "block";
    return;
  }
  
  // Clear previous errors
  errorElement.style.display = "none";
  
  // Show loading state
  const loginButton = document.querySelector("#login-screen button");
  const originalBtnText = loginButton.textContent;
  loginButton.textContent = "Logging in...";
  loginButton.disabled = true;
  
  // Send login request to server
  fetch("/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ password })
  })
    .then(res => {
      if (!res.ok) throw new Error('Invalid password');
      return res.json();
    })
    .then(data => {
      // Store token and show admin panel
      authToken = data.token;
      sessionStorage.setItem("authToken", authToken);
      showAdminPanel();
      loadSubmissions(authToken);
    })
    .catch(error => {
      console.error("Login error:", error);
      errorElement.textContent = "Invalid password. Please try again.";
      errorElement.style.display = "block";
    })
    .finally(() => {
      // Restore button state
      loginButton.textContent = originalBtnText;
      loginButton.disabled = false;
    });
}

// Function to show the login screen
function showLoginScreen() {
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("admin-panel").classList.add("hidden");
}

// Function to show the admin panel
function showAdminPanel() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("admin-panel").classList.remove("hidden");
}

// Function to load submissions
function loadSubmissions(token) {
  // Show loading indicator
  const tableBody = document.getElementById("table-body");
  tableBody.innerHTML = `
    <tr>
      <td colspan="100%" style="text-align: center; padding: 20px;">
        <div class="spinner"></div>
        <p>Loading submissions...</p>
      </td>
    </tr>
  `;
  
  // Get pagination parameters from URL or defaults
  const urlParams = new URLSearchParams(window.location.search);
  const page = parseInt(urlParams.get('page')) || 1;
  const limit = parseInt(urlParams.get('limit')) || 10;
  
  fetch(`/admin/submissions?page=${page}&limit=${limit}`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  })
    .then(res => {
      if (!res.ok) {
        if (res.status === 401) {
          // Unauthorized - token expired or invalid
          sessionStorage.removeItem("authToken");
          showLoginScreen();
          throw new Error('Session expired. Please login again.');
        }
        throw new Error('Failed to fetch submissions');
      }
      return res.json();
    })
    .then(data => {
      if (data.success === false) {
        throw new Error(data.error || 'Failed to load submissions');
      }
      renderTable(data.submissions);
      renderPagination(data.pagination);
    })
    .catch(error => {
      console.error("Load submissions error:", error);
      tableBody.innerHTML = `
        <tr>
          <td colspan="100%" style="text-align: center; color: red;">
            ${error.message || 'Failed to load submissions. Please try again.'}
          </td>
        </tr>
      `;
    });
}

// Function to render the submissions table
function renderTable(submissions) {
  if (!submissions || submissions.length === 0) {
    document.getElementById("table-body").innerHTML = `
      <tr>
        <td colspan="100%" style="text-align: center; padding: 20px;">
          No submissions found.
        </td>
      </tr>
    `;
    return;
  }
  
  // Get all possible keys from all submissions
  const allKeys = new Set();
  submissions.forEach(submission => {
    Object.keys(submission).forEach(key => {
      if (key !== 'id' && key !== 'file') { // These will be handled separately
        allKeys.add(key);
      }
    });
  });
  
  // Always include these columns
  const orderedKeys = ['id', ...Array.from(allKeys).sort(), 'file', 'actions'];
  
  // Create the header row
  const headerRow = document.getElementById("table-header");
  headerRow.innerHTML = '';
  orderedKeys.forEach(key => {
    const th = document.createElement('th');
    // Format the header name (capitalize first letter, replace underscores)
    th.textContent = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
    headerRow.appendChild(th);
  });
  
  // Create the table body
  const tableBody = document.getElementById("table-body");
  tableBody.innerHTML = '';
  
  submissions.forEach(submission => {
    const row = document.createElement('tr');
    
    orderedKeys.forEach(key => {
      const cell = document.createElement('td');
      
      if (key === 'actions') {
        // Add action buttons
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.setAttribute('aria-label', `Delete submission ${submission.id}`);
        deleteBtn.onclick = () => deleteSubmission(submission.id);
        cell.appendChild(deleteBtn);
      } else if (key === 'file' && submission.file) {
        // Add file download link if file exists
        const link = document.createElement('a');
        link.href = `/uploads/${submission.file}`;
        link.textContent = 'Download';
        link.target = '_blank';
        cell.appendChild(link);
      } else if (key === 'multiSelect' && Array.isArray(submission[key])) {
        // Format arrays
        cell.textContent = submission[key].join(', ');
      } else if (key === 'created_at' && submission[key]) {
        // Format dates
        const date = new Date(submission[key]);
        cell.textContent = date.toLocaleString();
      } else {
        // Regular content
        cell.textContent = submission[key] !== undefined && submission[key] !== null 
          ? submission[key] 
          : '';
      }
      
      row.appendChild(cell);
    });
    
    tableBody.appendChild(row);
  });
}

// Render pagination controls
function renderPagination(pagination) {
  if (!pagination) return;
  
  const { total, page, limit, pages } = pagination;
  const paginationDiv = document.getElementById("pagination");
  paginationDiv.innerHTML = '';
  
  if (total === 0) return;
  
  // Previous button
  const prevBtn = document.createElement("button");
  prevBtn.textContent = "« Prev";
  prevBtn.disabled = page <= 1;
  prevBtn.setAttribute('aria-label', 'Previous page');
  prevBtn.addEventListener("click", () => {
    if (page > 1) changePage(page - 1);
  });
  paginationDiv.appendChild(prevBtn);
  
  // Page numbers
  const maxButtons = 5; // Maximum number of page buttons to show
  let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
  let endPage = Math.min(pages, startPage + maxButtons - 1);
  
  // Adjust if we're near the end
  if (endPage - startPage + 1 < maxButtons && startPage > 1) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }
  
  // First page button if not showing first page
  if (startPage > 1) {
    const firstBtn = document.createElement("button");
    firstBtn.textContent = "1";
    firstBtn.setAttribute('aria-label', 'Go to page 1');
    firstBtn.addEventListener("click", () => changePage(1));
    paginationDiv.appendChild(firstBtn);
    
    // Ellipsis if needed
    if (startPage > 2) {
      const ellipsis = document.createElement("span");
      ellipsis.textContent = "...";
      ellipsis.style.margin = "0 5px";
      paginationDiv.appendChild(ellipsis);
    }
  }
  
  // Page buttons
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement("button");
    pageBtn.textContent = i.toString();
    pageBtn.setAttribute('aria-label', `Go to page ${i}`);
    if (i === page) {
      pageBtn.classList.add("active");
      pageBtn.setAttribute('aria-current', 'page');
    }
    pageBtn.addEventListener("click", () => changePage(i));
    paginationDiv.appendChild(pageBtn);
  }
  
  // Ellipsis and last page if needed
  if (endPage < pages) {
    if (endPage < pages - 1) {
      const ellipsis = document.createElement("span");
      ellipsis.textContent = "...";
      ellipsis.style.margin = "0 5px";
      paginationDiv.appendChild(ellipsis);
    }
    
    const lastBtn = document.createElement("button");
    lastBtn.textContent = pages.toString();
    lastBtn.setAttribute('aria-label', `Go to page ${pages}`);
    lastBtn.addEventListener("click", () => changePage(pages));
    paginationDiv.appendChild(lastBtn);
  }
  
  // Next button
  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next »";
  nextBtn.disabled = page >= pages;
  nextBtn.setAttribute('aria-label', 'Next page');
  nextBtn.addEventListener("click", () => {
    if (page < pages) changePage(page + 1);
  });
  paginationDiv.appendChild(nextBtn);
  
  // Add page summary
  const summary = document.createElement("div");
  summary.style.marginTop = "10px";
  summary.style.textAlign = "center";
  summary.textContent = `Showing ${total === 0 ? 0 : (page - 1) * limit + 1}-${Math.min(page * limit, total)} of ${total} entries`;
  paginationDiv.appendChild(summary);
}

// Change page and reload submissions
function changePage(page) {
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set('page', page);
  
  // Update URL without reloading the page
  const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
  window.history.pushState({ path: newUrl }, '', newUrl);
  
  // Reload submissions with the new page
  const token = sessionStorage.getItem("authToken");
  if (token) loadSubmissions(token);
}

// Function to download submissions as CSV
function downloadCSV() {
  const token = sessionStorage.getItem("authToken");
  if (!token) {
    alert("Your session has expired. Please login again.");
    logout();
    return;
  }

  // Show loading state
  const downloadBtn = document.querySelector("button[aria-label='Download CSV']");
  const originalBtnText = downloadBtn.textContent;
  downloadBtn.textContent = "Downloading...";
  downloadBtn.disabled = true;

  // Send request to server for CSV data
  fetch('/admin/export-csv', {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  })
    .then(response => {
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired');
        }
        throw new Error('Failed to download data');
      }
      return response.text();
    })
    .then(csv => {
      // Create a blob and download link
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `submissions_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    })
    .catch(error => {
      console.error("Download error:", error);
      if (error.message === 'Session expired') {
        sessionStorage.removeItem("authToken");
        showLoginScreen();
      } else {
        alert("Error downloading CSV: " + error.message);
      }
    })
    .finally(() => {
      // Restore button state
      downloadBtn.textContent = originalBtnText;
      downloadBtn.disabled = false;
    });
}

// Function to delete a submission
function deleteSubmission(id) {
  if (!confirm(`Are you sure you want to delete submission #${id}? This cannot be undone.`)) {
    return;
  }
  
  const token = sessionStorage.getItem("authToken");
  if (!token) {
    alert("Your session has expired. Please login again.");
    logout();
    return;
  }
  
  fetch(`/admin/submissions/${id}`, {
    method: 'DELETE',
    headers: {
      "Authorization": `Bearer ${token}`
    }
  })
    .then(res => {
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Session expired');
        }
        throw new Error('Failed to delete submission');
      }
      return res.json();
    })
    .then(data => {
      if (data.success) {
        // Reload the current page to reflect changes
        const urlParams = new URLSearchParams(window.location.search);
        const currentPage = parseInt(urlParams.get('page')) || 1;
        loadSubmissions(token);
      } else {
        throw new Error(data.message || 'Failed to delete submission');
      }
    })
    .catch(error => {
      console.error("Delete error:", error);
      if (error.message === 'Session expired') {
        sessionStorage.removeItem("authToken");
        showLoginScreen();
      } else {
        alert("Error deleting submission: " + error.message);
      }
    });
}

// Function to logout and return to login screen
function logout() {
  sessionStorage.removeItem("authToken");
  authToken = null;
  showLoginScreen();
}

