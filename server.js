const express = require('express');
const path = require('path');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
require('dotenv').config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure uploads directory exists
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Create unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept only certain file types
  const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    return cb(null, true);
  }
  
  cb(new Error('Invalid file type. Only PDF, JPG, and PNG are allowed.'));
};

// Configure upload with size limit (1MB)
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1024 * 1024 // 1MB
  }
});

// Initialize database
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

// Initialize database tables
function initDatabase() {
  // Create tables if they don't exist
  db.serialize(() => {
    // Create submissions table
    db.run(`
      CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        short_answer TEXT,
        long_answer TEXT,
        multi_select TEXT,
        single_select TEXT,
        date TEXT,
        time TEXT,
        phone TEXT,
        email TEXT,
        number INTEGER,
        website TEXT,
        scale INTEGER,
        dropdown TEXT,
        file TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create admin users table
    db.run(`
      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, function(err) {
      if (err) {
        console.error('Error creating admins table:', err.message);
      } else {
        // Check if default admin exists
        db.get('SELECT * FROM admins LIMIT 1', (err, row) => {
          if (err) {
            console.error('Error checking admin:', err.message);
          } else if (!row) {
            // Create default admin with bcrypt hashed password
            const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
            bcrypt.hash(adminPassword, 10, (err, hash) => {
              if (err) {
                console.error('Error hashing password:', err.message);
              } else {
                db.run('INSERT INTO admins (username, password) VALUES (?, ?)', ['admin', hash], function(err) {
                  if (err) {
                    console.error('Error creating default admin:', err.message);
                  } else {
                    console.log('Default admin created. Username: admin, Password:', adminPassword);
                  }
                });
              }
            });
          }
        });
      }
    });
  });
}

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  const token = authHeader.split(' ')[1];
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    
    req.userId = decoded.id;
    next();
  });
}

// Routes

// Serve admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Admin authentication
app.post('/admin/auth', (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required' });
  }
  
  db.get('SELECT * FROM admins WHERE username = ?', ['admin'], (err, admin) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
    
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Authentication failed' });
    }
    
    bcrypt.compare(password, admin.password, (err, match) => {
      if (err) {
        console.error('Bcrypt error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
      }
      
      if (!match) {
        return res.status(401).json({ success: false, message: 'Authentication failed' });
      }
      
      // Generate JWT token
      const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '1h' });
      
      res.json({ success: true, token });
    });
  });
});

// Verify token
app.post('/admin/verify', authenticate, (req, res) => {
  res.json({ success: true });
});

// Get submissions
app.get('/admin/submissions', authenticate, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  
  db.all('SELECT * FROM submissions ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset], (err, submissions) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
    
    // Get total count for pagination
    db.get('SELECT COUNT(*) as count FROM submissions', (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
      }
      
      res.json({
        success: true,
        submissions,
        pagination: {
          total: result.count,
          page,
          limit,
          pages: Math.ceil(result.count / limit)
        }
      });
    });
  });
});

// Delete submission
app.delete('/admin/submission/:id', authenticate, (req, res) => {
  const id = req.params.id;
  
  if (!id) {
    return res.status(400).json({ success: false, message: 'Submission ID is required' });
  }
  
  // Get file path before deleting
  db.get('SELECT file FROM submissions WHERE id = ?', [id], (err, submission) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
    
    // Delete from database
    db.run('DELETE FROM submissions WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
      }
      
      // If no rows affected
      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Submission not found' });
      }
      
      // Delete file if exists
      if (submission && submission.file) {
        const filePath = path.join(__dirname, 'uploads', submission.file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      res.json({ success: true, message: 'Submission deleted successfully' });
    });
  });
});

// Submit form endpoint
app.post('/submit-form', upload.single('upload'), (req, res) => {
  try {
    const {
      shortAnswer,
      longAnswer,
      singleSelect,
      date,
      time,
      phone,
      email,
      number,
      website,
      scale,
      dropdown
    } = req.body;
    
    // Handle multi-select checkboxes (comes as array)
    const multiSelect = req.body.multiSelect ? 
      (Array.isArray(req.body.multiSelect) ? 
        req.body.multiSelect.join(', ') : 
        req.body.multiSelect) : 
      null;
    
    // Get file info if uploaded
    const file = req.file ? req.file.filename : null;
    
    // Insert into database
    db.run(`
      INSERT INTO submissions (
        short_answer, 
        long_answer, 
        multi_select, 
        single_select, 
        date, 
        time, 
        phone, 
        email, 
        number, 
        website, 
        scale, 
        dropdown, 
        file
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      shortAnswer,
      longAnswer,
      multiSelect,
      singleSelect,
      date,
      time,
      phone,
      email,
      number || null,
      website,
      scale || null,
      dropdown,
      file
    ], function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ success: false, message: 'Error saving submission' });
      }
      
      res.json({ success: true, message: 'Form submitted successfully', id: this.lastID });
    });
  } catch (error) {
    console.error('Form submission error:', error);
    res.status(500).json({ success: false, message: 'An error occurred' });
  }
});

// Handle file upload errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File is too large. Maximum size is 1MB.' });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  
  if (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
  
  next();
});

// Serve uploaded files
app.use('/uploads', authenticate, express.static(path.join(__dirname, 'uploads')));

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close(() => {
    console.log('Database connection closed');
    process.exit(0);
  });
});

