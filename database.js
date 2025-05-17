import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('responses.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shortAnswer TEXT,
      longAnswer TEXT,
      hobbies TEXT,
      gender TEXT,
      country TEXT,
      filename TEXT
    )
  `);
});

export default db;

