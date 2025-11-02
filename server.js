require('dotenv').config({ quiet: true });
const express = require('express');
const app = express();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import custom modules
const logger = require('./config/logger');
const { errorHandler, AppError, catchAsync } = require('./middleware/errorHandler');
const { formValidationRules, loginValidationRules, validate } = require('./middleware/validation');
const { hashPassword, comparePassword, validateEnvVariables } = require('./utils/auth');

// Validate environment variables on startup
validateEnvVariables();

// Configuration
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'responses.db');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Connect to SQLite database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    logger.error('Database connection error:', err);
    process.exit(1);
  } else {
    logger.info('Connected to the SQLite database');
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
      logger.error('Error creating submissions table:', err);
      process.exit(1);
    } else {
      logger.info('Submissions table created or already exists');
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
    fileSize: process.env.MAX_FILE_SIZE || 1024 * 1024 // 1MB limit
  },
  fileFilter: function(req, file, cb) {
    // Accept only specific file types
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type. Only PDF, JPG, and PNG are allowed.', 400));
    }
  }
});

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later.'
});

app.use('/api/', limiter);
app.use('/admin/login', authLimiter);

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
    return next(new AppError('Unauthorized - No token provided', 401));
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn('Invalid token attempt', { ip: req.ip, error: err.message });
      return next(new AppError('Invalid or expired token', 401));
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Admin login
app.post('/admin/login', loginValidationRules, validate, catchAsync(async (req, res, next) => {
  const { password } = req.body;
  
  if (password !== ADMIN_PASSWORD) {
    logger.warn('Failed login attempt', { ip: req.ip });
    return next(new AppError('Invalid password', 401));
  }
  
  logger.info('Successful admin login', { ip: req.ip });
  
  // Generate token
  const token = jwt.sign({ isAdmin: true }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ success: true, token });
}));

// Get submissions
app.get('/admin/submissions', authenticateToken, catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  
  // Count total submissions
  db.get('SELECT COUNT(*) as total FROM submissions', [], (err, count) => {
    if (err) {
      logger.error('Error counting submissions:', err);
      return next(new AppError('Database error', 500));
    }
    
    const total = count.total;
    const pages = Math.ceil(total / limit);
    
    // Get submissions for current page
    db.all('SELECT * FROM submissions ORDER BY id DESC LIMIT ? OFFSET ?', [limit, offset], (err, rows) => {
      if (err) {
        logger.error('Error fetching submissions:', err);
        return next(new AppError('Database error', 500));
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
}));

// Delete submission
app.delete('/admin/submissions/:id', authenticateToken, catchAsync(async (req, res, next) => {
  const id = req.params.id;
  
  // Get file info before deleting
  db.get('SELECT file FROM submissions WHERE id = ?', [id], (err, row) => {
    if (err) {
      logger.error('Error retrieving submission file:', err);
      return next(new AppError('Database error', 500));
    }
    
    // Delete record from database
    db.run('DELETE FROM submissions WHERE id = ?', [id], function(err) {
      if (err) {
        logger.error('Error deleting submission:', err);
        return next(new AppError('Database error', 500));
      }
      
      // If no rows were affected
      if (this.changes === 0) {
        return next(new AppError('Submission not found', 404));
      }
      
      // Delete associated file if exists
      if (row && row.file) {
        const filePath = path.join(uploadsDir, row.file);
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, (err) => {
            if (err) logger.error('Error deleting file:', err);
          });
        }
      }
      
      logger.info('Submission deleted', { id, admin: req.user });
      res.json({ success: true, message: 'Submission deleted successfully' });
    });
  });
}));

// Export submissions as CSV
app.get('/admin/export-csv', authenticateToken, catchAsync(async (req, res, next) => {
  db.all('SELECT * FROM submissions ORDER BY id DESC', [], (err, rows) => {
    if (err) {
      logger.error('Error fetching submissions for CSV:', err);
      return next(new AppError('Database error', 500));
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
    logger.info('CSV export completed', { admin: req.user, rowCount: rows.length });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=submissions_${new Date().toISOString().slice(0,10)}.csv`);
    res.send(csv);
  });
}));

// Submit form
app.post('/submit-form', upload.single('upload'), formValidationRules, validate, catchAsync(async (req, res, next) => {
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
        logger.error('Error saving submission:', err);
        return next(new AppError('Error saving your submission', 500));
      }
      
      logger.info('Form submission successful', { id: this.lastID, ip: req.ip });
      res.json({ success: true, message: 'Form submitted successfully!', id: this.lastID });
    });
}));

// 404 handler
app.use((req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  db.close(() => {
    logger.info('Database connection closed');
    process.exit(0);
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Admin panel available at http://localhost:${PORT}/admin`);
});

