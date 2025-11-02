const logger = require('../config/logger');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const db = require('../utils/database');

// Create a new submission
exports.createSubmission = catchAsync(async (req, res, next) => {
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
});
