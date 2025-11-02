const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../responses.db');

// Create database connection
const db = new sqlite3.Database(DB_PATH);

// Enable WAL mode for better concurrent access
db.run('PRAGMA journal_mode = WAL');

// Create indexes for frequently queried fields
db.serialize(() => {
  // Check if indexes exist, if not create them
  db.run(`CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at)`, (err) => {
    if (err) console.error('Error creating created_at index:', err);
  });
  
  db.run(`CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions(email)`, (err) => {
    if (err) console.error('Error creating email index:', err);
  });
});

module.exports = db;
