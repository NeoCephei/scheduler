require('dotenv').config({ path: '../.env' });
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;
const dbFile = process.env.DB_FILE || './database.sqlite';
const dbPath = path.resolve(__dirname, dbFile);

app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to the SQLite database:', err.message);
  } else {
    console.log('Connected to the SQLite database at:', dbPath);
    // Create a dummy table if it doesn't exist for the health check
    db.run('CREATE TABLE IF NOT EXISTS health_check (id INTEGER PRIMARY KEY, status TEXT)', (err) => {
        if (!err) {
            db.run('INSERT OR REPLACE INTO health_check (id, status) VALUES (1, "ok")');
        }
    });
  }
});

app.get('/api/health', (req, res) => {
  db.get('SELECT status FROM health_check WHERE id = 1', (err, row) => {
    if (err) {
      return res.status(500).json({ status: 'error', message: 'Database connection failed', error: err.message });
    }
    res.json({ status: 'ok', message: 'Backend and SQLite Database are healthy', dbPath });
  });
});

app.get('/', (req, res) => {
  res.send('Scheduler Backend API (SQLite)');
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
