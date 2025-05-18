// Using a more secure approach for admin authentication
document.addEventListener('DOMContentLoaded', () => {
  // Check for encrypted token instead of plain password
  const authToken = sessionStorage.getItem("authToken");
  if (authToken) verifyAuth(authToken);

  // Add event listener for Enter key on password field
  const passwordField = document.getElementById("admin-password");
  if (passwordField) {
    passwordField.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        verifyPassword();
      }
    });
    // Focus on password field for better UX
    passwordField.focus();
  }
});

function verifyPassword() {
  const password = document.getElementById("admin-password").value;
  if (!password) {
    document.getElementById("login-error").innerText = "Password cannot be empty.";
    return;
  }
  
  // Show loading state
  const loginBtn = document.querySelector("#login-screen button");
  const originalBtnText = loginBtn.textContent;
  loginBtn.textContent = "Verifying...";
  loginBtn.disabled = true;
  
  fetch("/admin/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  })
    .then(res => {
      if (!res.ok) throw new Error('Authentication failed');
      return res.json();
    })
    .then(data => {
      if (data.success && data.token) {
        // Store auth token in sessionStorage instead of localStorage for better security
        // sessionStorage is cleared when the browser/tab is closed
        sessionStorage.setItem("authToken", data.token);
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("admin-panel").classList.remove("hidden");
        loadSubmissions(data.token);
      } else {
        throw new Error('Invalid response format');
      }
    })
    .catch(error => {
      console.error("Auth error:", error);
      document.getElementById("login-error").innerText = "Incorrect password.";
    })
    .finally(() => {
      // Reset button state
      loginBtn.textContent = originalBtnText;
      loginBtn.disabled = false;
    });
}

function verifyAuth(token) {
  fetch("/admin/verify", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  })
    .then(res => {
      if (!res.ok) throw new Error('Session expired');
      return res.json();
    })
    .then(data => {
      if (data.success) {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("admin-panel").classList.remove("hidden");
        loadSubmissions(token);
      } else {
        throw new Error('Invalid token');
      }
    })
    .catch(() => {
      sessionStorage.removeItem("authToken");
      document.getElementById("login-error").innerText = "Session expired. Please login again.";
    });
}

function loadSubmissions(token) {
  fetch("/admin/submissions", {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  })
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch submissions');
      return res.json();
    })
    .then(data => {
      renderTable(data.submissions);
    })
    .catch(error => {
      console.error("Load submissions error:", error);
      alert("Failed to load submissions. Please try again.");
    });
}

function logout() {
  // Clear session storage and reload
  sessionStorage.removeItem("authToken");
  location.reload();
}

function renderTable(submissions) {
  const tableHead = document.getElementById("table-header");
  const tableBody = document.getElementById("table-body");
  tableHead.innerHTML = "";
  tableBody.innerHTML = "";

  if (!submissions || submissions.length === 0) {
    tableBody.innerHTML = "<tr><td colspan='100%' style='text-align: center;'>No submissions found.</td></tr>";
    return;
  }

  // Create table headers
  const keys = Object.keys(submissions[0]);
  keys.forEach(key => {
    const th = document.createElement("th");
    th.textContent = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
    th.setAttribute('scope', 'col'); // Accessibility improvement
    tableHead.appendChild(th);
  });

  // Add action column header
  const actionTh = document.createElement("th");
  actionTh.textContent = "Actions";
  actionTh.setAttribute('scope', 'col'); // Accessibility improvement
  tableHead.appendChild(actionTh);

  // Create table rows
  submissions.forEach(row => {
    const tr = document.createElement("tr");
    
    // Add data cells
    keys.forEach(key => {
      const td = document.createElement("td");
      
      if (key === "file" && row[key]) {
        const a = document.createElement("a");
        a.href = `/uploads/${row[key]}`;
        a.textContent = "View File";
        a.target = "_blank";
        a.setAttribute('aria-label', `View file for submission ${row.id || ''}`);
        td.appendChild(a);
      } else if (key === "created_at" && row[key]) {
        // Format date if it exists
        try {
          const date = new Date(row[key]);
          td.textContent = date.toLocaleString();
        } catch (e) {
          td.textContent = row[key] || "-";
        }
      } else {
        td.textContent = row[key] || "-";
      }
      
      tr.appendChild(td);
    });
    
    // Add action cell
    const actionTd = document.createElement("td");
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.classList.add("delete-btn");
    deleteBtn.setAttribute('aria-label', `Delete submission ${row.id || ''}`);
    deleteBtn.addEventListener("click", () => deleteSubmission(row.id));
    actionTd.appendChild(deleteBtn);
    tr.appendChild(actionTd);
    
    tableBody.appendChild(tr);
  });
}

function deleteSubmission(id) {
  if (!id) return;
  
  if (!confirm("Are you sure you want to delete this submission?")) {
    return;
  }

  const token = sessionStorage.getItem("authToken");
  if (!token) {
    alert("Your session has expired. Please login again.");
    logout();
    return;
  }

  fetch(`/admin/submission/${id}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  })
    .then(res => {
      if (!res.ok) throw new Error('Delete failed');
      return res.json();
    })
    .then(data => {
      if (data.success) {
        alert("Submission deleted successfully.");
        loadSubmissions(token);
      } else {
        throw new Error('Failed to delete');
      }
    })
    .catch(error => {
      console.error("Delete error:", error);
      alert("Failed to delete submission. Please try again.");
    });
}

function downloadCSV() {
  const token = sessionStorage.getItem("authToken");
  if (!token) {
    alert("Your session has expired. Please login again.");
    logout();
    return;
  }

  // Option 1: Generate CSV from current table (client-side)
  const table = document.getElementById("submissions-table");
  const rows = table.querySelectorAll("tr");
  
  if (rows.length <= 1) {
    alert("No data to download.");
    return;
  }
  
  // Get all data except the "Actions" column
  const csv = Array.from(rows).map(row => {
    // Get all cells except the last one (Actions)
    const cells = Array.from(row.cells).slice(0, -1);
    return cells.map(cell => `"${(cell.textContent || "").replace(/"/g, '""')}"`).join(",");
  }).join("\n");

  // Create download link
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "submissions_" + new Date().toISOString().slice(0, 10) + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
