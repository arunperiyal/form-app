const express = require('express');
const app = express();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Configuration
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'; // Change this in production!
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const DB_PATH = path.join(__dirname, 'responses.db');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Connect to SQLite database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to the SQLite database');
    initDatabase();
  }
});

// Initialize database with required tables
function initDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shortAnswer TEXT,
      longAnswer TEXT,
      multiSelect TEXT,
      singleSelect TEXT,
      date TEXT,
      time TEXT,
      phone TEXT,
      email TEXT,
      number INTEGER,
      website TEXT,
      scale INTEGER,
      dropdown TEXT,
      file TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating submissions table:', err);
    } else {
      console.log('Submissions table created or already exists');
    }
  });
}

// Configure multer storage for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function(req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, uniqueSuffix + fileExtension);
  }
});

// File upload middleware with file type and size validation
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 // 1MB limit
  },
  fileFilter: function(req, file, cb) {
    // Accept only specific file types
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, and PNG are allowed.'));
    }
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Authentication middleware for admin routes
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Admin login
app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: 'Invalid password' });
  }
  
  // Generate token
  const token = jwt.sign({ isAdmin: true }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ success: true, token });
});

// Get submissions
app.get('/admin/submissions', authenticateToken, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  
  // Count total submissions
  db.get('SELECT COUNT(*) as total FROM submissions', [], (err, count) => {
    if (err) {
      console.error('Error counting submissions:', err);
      return res.status(500).json({ success: false, error: 'Database error' });
    }
    
    const total = count.total;
    const pages = Math.ceil(total / limit);
    
    // Get submissions for current page
    db.all('SELECT * FROM submissions ORDER BY id DESC LIMIT ? OFFSET ?', [limit, offset], (err, rows) => {
      if (err) {
        console.error('Error fetching submissions:', err);
        return res.status(500).json({ success: false, error: 'Database error' });
      }
      
      // Process multiSelect values
      rows.forEach(row => {
        if (row.multiSelect) {
          try {
            row.multiSelect = JSON.parse(row.multiSelect);
          } catch (e) {
            row.multiSelect = row.multiSelect.split(',');
          }
        }
      });
      
      res.json({
        success: true,
        submissions: rows,
        pagination: {
          total,
          page,
          limit,
          pages
        }
      });
    });
  });
});

// Delete submission
app.delete('/admin/submissions/:id', authenticateToken, (req, res) => {
  const id = req.params.id;
  
  // Get file info before deleting
  db.get('SELECT file FROM submissions WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Error retrieving submission file:', err);
      return res.status(500).json({ success: false, error: 'Database error' });
    }
    
    // Delete record from database
    db.run('DELETE FROM submissions WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Error deleting submission:', err);
        return res.status(500).json({ success: false, error: 'Database error' });
      }
      
      // If no rows were affected
      if (this.changes === 0) {
        return res.status(404).json({ success: false, error: 'Submission not found' });
      }
      
      // Delete associated file if exists
      if (row && row.file) {
        const filePath = path.join(uploadsDir, row.file);
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, (err) => {
            if (err) console.error('Error deleting file:', err);
          });
        }
      }
      
      res.json({ success: true, message: 'Submission deleted successfully' });
    });
  });
});

// Export submissions as CSV
app.get('/admin/export-csv', authenticateToken, (req, res) => {
  db.all('SELECT * FROM submissions ORDER BY id DESC', [], (err, rows) => {
    if (err) {
      console.error('Error fetching submissions for CSV:', err);
      return res.status(500).json({ success: false, error: 'Database error' });
    }
    
    // Convert to CSV
    let csv = '';
    
    // Get all possible headers
    const headers = new Set();
    rows.forEach(row => {
      Object.keys(row).forEach(key => headers.add(key));
    });
    
    // Create header row
    csv += Array.from(headers).join(',') + '\n';
    
    // Add data rows
    rows.forEach(row => {
      const values = Array.from(headers).map(header => {
        let value = row[header] !== undefined && row[header] !== null ? row[header] : '';
        
        // Handle arrays
        if (header === 'multiSelect' && value) {
          try {
            value = JSON.parse(value);
            if (Array.isArray(value)) {
              value = value.join(';');
            }
          } catch (e) {
            // If already a string, leave as is
          }
        }
        
        // Escape quotes and wrap in quotes
        value = String(value).replace(/"/g, '""');
        return `"${value}"`;
      });
      
      csv += values.join(',') + '\n';
    });
    
    // Send CSV response
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=submissions_${new Date().toISOString().slice(0,10)}.csv`);
    res.send(csv);
  });
});

// Submit form
app.post('/submit-form', upload.single('upload'), (req, res) => {
  try {
    const formData = req.body;
    
    // Process multiSelect values (arrays)
    let multiSelect = formData.multiSelect;
    if (multiSelect) {
      if (!Array.isArray(multiSelect)) {
        multiSelect = [multiSelect];
      }
      multiSelect = JSON.stringify(multiSelect);
    }
    
    // Handle file upload
    const file = req.file ? req.file.filename : null;
    
    // Prepare data for insertion
    const data = {
      shortAnswer: formData.shortAnswer,
      longAnswer: formData.longAnswer,
      multiSelect: multiSelect,
      singleSelect: formData.singleSelect,
      date: formData.date,
      time: formData.time,
      phone: formData.phone,
      email: formData.email,
      number: formData.number,
      website: formData.website,
      scale: formData.scale,
      dropdown: formData.dropdown,
      file: file
    };
    
    // Insert into database
    const placeholders = Object.keys(data).map(() => '?').join(',');
    const columns = Object.keys(data).join(',');
    const values = Object.values(data);
    
    const sql = `INSERT INTO submissions (${columns}) VALUES (${placeholders})`;
    
    db.run(sql, values, function(err) {
      if (err) {
        console.error('Error saving submission:', err);
        return res.status(500).json({ success: false, message: 'Error saving your submission' });
      }
      
      res.json({ success: true, message: 'Form submitted successfully!', id: this.lastID });
    });
  } catch (error) {
    console.error('Form submission error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Admin panel available at http://localhost:${PORT}/admin`);
});

