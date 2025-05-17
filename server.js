const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const db = new sqlite3.Database('./database.sqlite');

// Middleware
app.use(express.static('public'));
app.use(express.json());

// File upload
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 1024 * 1024 }, // 1MB
});

// DB setup
db.run(`CREATE TABLE IF NOT EXISTS responses (
  id INTEGER PRIMARY KEY,
  shortAnswer TEXT,
  longAnswer TEXT,
  multiSelect TEXT,
  singleSelect TEXT,
  dropdown TEXT,
  filename TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

// Submit route
app.post('/submit', upload.single('upload'), (req, res) => {
  const {
    shortAnswer,
    longAnswer,
    singleSelect,
    dropdown
  } = req.body;

  const multiSelect = Array.isArray(req.body['multiSelect[]'])
    ? req.body['multiSelect[]'].join(', ')
    : req.body['multiSelect[]'] || '';

  const filename = req.file ? req.file.originalname : null;

  db.run(
    `INSERT INTO responses (shortAnswer, longAnswer, multiSelect, singleSelect, dropdown, filename)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [shortAnswer, longAnswer, multiSelect, singleSelect, dropdown, filename],
    (err) => {
      if (err) return res.status(500).json({ error: 'Database error.' });
      res.json({ message: 'Submission successful!' });
    }
  );
});

// Admin route
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

app.post('/admin', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD)
    return res.status(403).json({ error: 'Unauthorized' });

  db.all(`SELECT * FROM responses ORDER BY createdAt DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database read error' });
    res.json({ responses: rows });
  });
});

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));

