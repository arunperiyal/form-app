const adminPassword = localStorage.getItem("adminPassword");
if (adminPassword) verifyPassword(adminPassword);

function verifyPassword(pass = null) {
  const password = pass || document.getElementById("admin-password").value;
  fetch("/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("admin-panel").classList.remove("hidden");
        localStorage.setItem("adminPassword", password);
        renderTable(data.submissions);
      } else {
        document.getElementById("login-error").innerText = "Incorrect password.";
      }
    })
    .catch(() => {
      document.getElementById("login-error").innerText = "Error contacting server.";
    });
}

function logout() {
  localStorage.removeItem("adminPassword");
  location.reload();
}

function renderTable(submissions) {
  const tableHead = document.getElementById("table-header");
  const tableBody = document.getElementById("table-body");
  tableHead.innerHTML = "";
  tableBody.innerHTML = "";

  if (submissions.length === 0) {
    tableBody.innerHTML = "<tr><td colspan='100%'>No submissions found.</td></tr>";
    return;
  }

  const keys = Object.keys(submissions[0]);
  keys.forEach(key => {
    const th = document.createElement("th");
    th.innerText = key;
    tableHead.appendChild(th);
  });

  submissions.forEach(row => {
    const tr = document.createElement("tr");
    keys.forEach(key => {
      const td = document.createElement("td");
      if (key === "file" && row[key]) {
        const a = document.createElement("a");
        a.href = `/uploads/${row[key]}`;
        a.innerText = "View File";
        a.target = "_blank";
        td.appendChild(a);
      } else {
        td.innerText = row[key];
      }
      tr.appendChild(td);
    });
    tableBody.appendChild(tr);
  });
}

function downloadCSV() {
  const rows = document.querySelectorAll("table tr");
  const csv = Array.from(rows).map(row =>
    Array.from(row.cells).map(cell => `"${cell.innerText}"`).join(",")
  ).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "submissions.csv";
  a.click();
}

