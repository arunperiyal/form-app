const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const { formValidationRules, validate } = require('../middleware/validation');
const multer = require('multer');
const path = require('path');
const { AppError } = require('../middleware/errorHandler');

// Configure multer storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function(req, file, cb) {
    // Generate secure random filename
    const crypto = require('crypto');
    const randomName = crypto.randomBytes(16).toString('hex');
    const fileExtension = path.extname(file.originalname);
    cb(null, randomName + fileExtension);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: process.env.MAX_FILE_SIZE || 1024 * 1024
  },
  fileFilter: function(req, file, cb) {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type. Only PDF, JPG, and PNG are allowed.', 400));
    }
  }
});

// Public routes
router.post('/submit', upload.single('upload'), formValidationRules, validate, submissionController.createSubmission);

module.exports = router;
