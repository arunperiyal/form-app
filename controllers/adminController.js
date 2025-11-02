const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const db = require('../utils/database');
const path = require('path');
const fs = require('fs');

// Admin login
exports.login = catchAsync(async (req, res, next) => {
  const { password } = req.body;
  
  if (password !== process.env.ADMIN_PASSWORD) {
    logger.warn('Failed login attempt', { ip: req.ip });
    return next(new AppError('Invalid password', 401));
  }
  
  logger.info('Successful admin login', { ip: req.ip });
  
  // Generate token
  const token = jwt.sign({ isAdmin: true }, process.env.JWT_SECRET, { expiresIn: '2h' });
  res.json({ success: true, token });
});

// Get submissions
exports.getSubmissions = catchAsync(async (req, res, next) => {
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
});

// Delete submission
exports.deleteSubmission = catchAsync(async (req, res, next) => {
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
      
      if (this.changes === 0) {
        return next(new AppError('Submission not found', 404));
      }
      
      // Delete associated file if exists
      if (row && row.file) {
        const filePath = path.join(__dirname, '../uploads', row.file);
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
});

// Export CSV
exports.exportCSV = catchAsync(async (req, res, next) => {
  db.all('SELECT * FROM submissions ORDER BY id DESC', [], (err, rows) => {
    if (err) {
      logger.error('Error fetching submissions for CSV:', err);
      return next(new AppError('Database error', 500));
    }
    
    // Convert to CSV
    let csv = '';
    
    const headers = new Set();
    rows.forEach(row => {
      Object.keys(row).forEach(key => headers.add(key));
    });
    
    csv += Array.from(headers).join(',') + '\n';
    
    rows.forEach(row => {
      const values = Array.from(headers).map(header => {
        let value = row[header] !== undefined && row[header] !== null ? row[header] : '';
        
        if (header === 'multiSelect' && value) {
          try {
            value = JSON.parse(value);
            if (Array.isArray(value)) {
              value = value.join(';');
            }
          } catch (e) {
            // Leave as is
          }
        }
        
        value = String(value).replace(/"/g, '""');
        return `"${value}"`;
      });
      
      csv += values.join(',') + '\n';
    });
    
    logger.info('CSV export completed', { admin: req.user, rowCount: rows.length });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=submissions_${new Date().toISOString().slice(0,10)}.csv`);
    res.send(csv);
  });
});
