const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { loginValidationRules, validate } = require('../middleware/validation');

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return next(new (require('../middleware/errorHandler').AppError)('Unauthorized - No token provided', 401));
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      const logger = require('../config/logger');
      logger.warn('Invalid token attempt', { ip: req.ip, error: err.message });
      return next(new (require('../middleware/errorHandler').AppError)('Invalid or expired token', 401));
    }
    req.user = user;
    next();
  });
}

// Admin routes
router.post('/login', loginValidationRules, validate, adminController.login);
router.get('/submissions', authenticateToken, adminController.getSubmissions);
router.delete('/submissions/:id', authenticateToken, adminController.deleteSubmission);
router.get('/export-csv', authenticateToken, adminController.exportCSV);

module.exports = router;
