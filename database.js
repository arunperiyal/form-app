const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor(dbPath = './responses.db') {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error connecting to database:', err.message);
        throw err;
      }
      console.log('Connected to the SQLite database.');
    });
    
    // Enable foreign keys
    this.db.run('PRAGMA foreign_keys = ON');
  }

  // Run a query with parameters
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('Error running query:', err.message);
          reject(err);
          return;
        }
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  // Get a single row
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('Error getting row:', err.message);
          reject(err);
          return;
        }
        resolve(row);
      });
    });
  }

  // Get all rows
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Error getting rows:', err.message);
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  // Initialize database tables
  async init() {
    try {
      // Create submissions table
      await this.run(`CREATE TABLE IF NOT EXISTS submissions (
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
      
      // Create admin table
      await this.run(`CREATE TABLE IF NOT EXISTS admin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
      )`);
      
      console.log('Database initialized successfully');
      return true;
    } catch (err) {
      console.error('Error initializing database:', err);
      return false;
    }
  }

  // Add a form submission
  async addSubmission(formData) {
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
      file,
      created_at
    } = formData;

    // Format multiSelect array as JSON string
    const multiSelectJSON = Array.isArray(multiSelect) 
      ? JSON.stringify(multiSelect) 
      : multiSelect ? JSON.stringify([multiSelect]) : '[]';

    try {
      const result = await this.run(
        `INSERT INTO submissions (
          shortAnswer, longAnswer, multiSelect, singleSelect, date, time, phone, email, 
          number, website, scale, dropdown, file, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          shortAnswer, longAnswer, multiSelectJSON, singleSelect, date, time, phone, email,
          number, website, scale, dropdown, file, created_at || new Date().toISOString()
        ]
      );
      return { success: true, id: result.lastID };
    } catch (err) {
      console.error('Error adding submission:', err);
      return { success: false, error: err.message };
    }
  }

  // Get all submissions with pagination
  async getSubmissions(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      // Get total count
      const countRow = await this.get("SELECT COUNT(*) as total FROM submissions");
      const total = countRow.total;
      
      // Get submissions with pagination
      const rows = await this.all(
        "SELECT * FROM submissions ORDER BY created_at DESC LIMIT ? OFFSET ?",
        [limit, offset]
      );
      
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
      
      return {
        success: true,
        submissions,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (err) {
      console.error('Error getting submissions:', err);
      return { success: false, error: err.message };
    }
  }

  // Delete a submission by ID
  async deleteSubmission(id, uploadsDir) {
    try {
      // Get file info first
      const row = await this.get("SELECT file FROM submissions WHERE id = ?", [id]);
      
      // Delete from database
      const result = await this.run("DELETE FROM submissions WHERE id = ?", [id]);
      
      if (result.changes === 0) {
        return { success: false, message: 'Submission not found' };
      }
      
      // Delete file if exists
      if (row && row.file) {
        const filePath = path.join(uploadsDir, row.file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      return { success: true };
    } catch (err) {
      console.error('Error deleting submission:', err);
      return { success: false, error: err.message };
    }
  }

  // Close the database connection
  close() {
    this.db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
    });
  }
}

module.exports = Database;
