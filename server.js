const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve static files from public directory
app.use(express.static('public'));

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with original extension
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    cb(null, fileName);
  }
});

// File filter for allowed types
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, and PNG are allowed.'), false);
  }
};

// Configure upload limits
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1024 * 1024 // 1MB
  }
});

// Database setup
const db = new sqlite3.Database('./responses.db', (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initDatabase();
  }
});

// Initialize database tables
function initDatabase() {
  // Create submissions table
  db.run(`CREATE TABLE IF NOT EXISTS submissions (
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
    created_at TEXT
  )`);
  
  // Create admin table with hash for password
  db.run(`CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`, [], function(err) {
    if (err) {
      console.error('Error creating admin table:', err.message);
    } else {
      // Check if admin exists, if not create default admin user
      db.get("SELECT * FROM admin LIMIT 1", [], (err, row) => {
        if (err) {
          console.error(err.message);
        } else if (!row) {
          // Hash a default password - change this in production!
          const defaultPassword = "admin123";
          bcrypt.hash(defaultPassword, 10, (err, hash) => {
            if (err) {
              console.error("Error hashing password:", err);
            } else {
              db.run(
                `INSERT INTO admin (username, password) VALUES (?, ?)`,
                ["admin", hash],
                function(err) {
                  if (err) {
                    console.error("Error creating default admin:", err.message);
                  } else {
                    console.log("Default admin created. Username: admin, Password: admin123");
                    console.log("Please change this password after first login!");
                  }
                }
              );
            }
          });
        }
      });
    }
  });
}

// JWT secret - in production, use environment variables for this!
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Routes

// Form submission route
app.post('/submit-form', upload.single('upload'), (req, res) => {
  try {
    const {
      shortAnswer,
      longAnswer,
      multiSelect,
      singleSelect,
      date,
      time,
      phone,
      email,
      number,
      website,
      scale,
      dropdown,
      submitted_at
    } = req.body;

    // Format multiSelect array as JSON string
    const multiSelectJSON = Array.isArray(multiSelect) 
      ? JSON.stringify(multiSelect) 
      : multiSelect ? JSON.stringify([multiSelect]) : '[]';
    
    // Get file path if present
    const filePath = req.file ? req.file.filename : null;
    
    // Insert into database
    db.run(
      `INSERT INTO submissions (
        shortAnswer, longAnswer, multiSelect, singleSelect, date, time, phone, email, 
        number, website, scale, dropdown, file, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shortAnswer, longAnswer, multiSelectJSON, singleSelect, date, time, phone, email,
        number, website, scale, dropdown, filePath, submitted_at || new Date().toISOString()
      ],
      function(err) {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        res.json({ success: true, message: 'Form submitted successfully!', id: this.lastID });
      }
    );
  } catch (error) {
    console.error("Submission error:", error);
    res.status(500).json({ success: false, message: 'Server error processing your submission' });
  }
});

// Admin authentication
app.post('/admin/auth', (req, res) => {
  const { password } = req.body;
  
  // Get admin user from database
  db.get("SELECT * FROM admin WHERE username = ?", ["admin"], (err, row) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    if (!row) {
      return res.status(401).json({ success: false, message: 'Authentication failed' });
    }
    
    // Compare password
    bcrypt.compare(password, row.password, (err, result) => {
      if (err || !result) {
        return res.status(401).json({ success: false, message: 'Authentication failed' });
      }
      
      // Generate JWT token
      const token = jwt.sign({ id: row.id, username: row.username }, JWT_SECRET, { expiresIn: '2h' });
      
      res.json({ success: true, token });
    });
  });
});

// Verify admin token
app.post('/admin/verify', authenticateToken, (req, res) => {
  res.json({ success: true });
});

// Get all submissions
app.get('/admin/submissions', authenticateToken, (req, res) => {
  // Get pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  
  // Get total count
  db.get("SELECT COUNT(*) as total FROM submissions", [], (err, row) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    const total = row.total;
    
    // Get submissions with pagination
    db.all(
      "SELECT * FROM submissions ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [limit, offset],
      (err, rows) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        // Parse multiSelect JSON strings
        const submissions = rows.map(row => {
          try {
            if (row.multiSelect) {
              row.multiSelect = JSON.parse(row.multiSelect);
            }
          } catch (e) {
            row.multiSelect = [];
          }
          return row;
        });
        
        res.json({
          success: true,
          submissions,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
          }
        });
      }
    );
  });
});

// Delete submission
app.delete('/admin/submission/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  // Get file info first to delete file if exists
  db.get("SELECT file FROM submissions WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    
    // Delete from database
    db.run("DELETE FROM submissions WHERE id = ?", [id], function(err) {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Submission not found' });
      }
      
      // Delete file if exists
      if (row && row.file) {
        const filePath = path.join(uploadDir, row.file);
        fs.unlink(filePath, (err) => {
          if (err) console.error("Error deleting file:", err);
        });
      }
      
      res.json({ success: true, message: 'Submission deleted successfully' });
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
