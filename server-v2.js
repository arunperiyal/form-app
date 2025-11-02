require('dotenv').config({ quiet: true });
const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import custom modules
const logger = require('./config/logger');
const { errorHandler, AppError } = require('./middleware/errorHandler');
const { validateEnvVariables } = require('./utils/auth');
const db = require('./utils/database');

// Import routes
const submissionRoutes = require('./routes/submissions');
const adminRoutes = require('./routes/admin');

// Validate environment variables on startup
validateEnvVariables();

// Configuration
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize database
db.serialize(() => {
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
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later.'
});

app.use('/api/', limiter);
app.use('/admin/login', authLimiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API Routes - versioned
app.use('/api/v1/submissions', submissionRoutes);
app.use('/api/v1/admin', adminRoutes);

// Legacy routes for backward compatibility
app.post('/submit-form', (req, res, next) => {
  req.url = '/api/v1/submissions/submit';
  submissionRoutes(req, res, next);
});

app.post('/admin/login', (req, res, next) => {
  req.url = '/api/v1/admin/login';
  adminRoutes(req, res, next);
});

app.get('/admin/submissions', (req, res, next) => {
  req.url = '/api/v1/admin/submissions';
  adminRoutes(req, res, next);
});

app.delete('/admin/submissions/:id', (req, res, next) => {
  req.url = `/api/v1/admin/submissions/${req.params.id}`;
  adminRoutes(req, res, next);
});

app.get('/admin/export-csv', (req, res, next) => {
  req.url = '/api/v1/admin/export-csv';
  adminRoutes(req, res, next);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

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
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Admin panel available at http://localhost:${PORT}/admin`);
  logger.info(`Health check at http://localhost:${PORT}/health`);
});

// Export for testing
module.exports = app;
