const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Initialize database connection
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to database');
  }
});

// Export database methods
module.exports = {
  // Get all submissions
  getAllSubmissions: () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM submissions ORDER BY created_at DESC', (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  },

  // Get submissions with pagination
  getSubmissions: (page = 1, limit = 10) => {
    return new Promise((resolve, reject) => {
      const offset = (page - 1) * limit;
      
      db.all('SELECT * FROM submissions ORDER BY created_at DESC LIMIT ? OFFSET ?', 
        [limit, offset], 
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            db.get('SELECT COUNT(*) as total FROM submissions', (err, result) => {
              if (err) {
                reject(err);
              } else {
                resolve({
                  submissions: rows,
                  pagination: {
                    total: result.total,
                    page,
                    limit,
                    pages: Math.ceil(result.total / limit)
                  }
                });
              }
            });
          }
        }
      );
    });
  },

  // Get a submission by ID
  getSubmission: (id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM submissions WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  },

  // Create a new submission
  createSubmission: (data) => {
    return new Promise((resolve, reject) => {
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
        file
      } = data;

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
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  },

  // Delete a submission
  deleteSubmission: (id) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM submissions WHERE id = ?', [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  },

  // Authenticate admin
  authenticateAdmin: (username, password) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM admins WHERE username = ?', [username], (err, admin) => {
        if (err) {
          reject(err);
        } else {
          resolve(admin);
        }
      });
    });
  },

  // Close database connection
  close: () => {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
};

