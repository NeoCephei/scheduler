require('dotenv').config({ path: '../.env' });
const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;
const dbFile = process.env.DB_FILE || './database.sqlite';
const dbPath = path.resolve(__dirname, dbFile);

app.use(cors());
app.use(express.json());

// Initialize better-sqlite3 database
let db;
try {
  db = new Database(dbPath);
  console.log('Connected to the SQLite database at:', dbPath);
  // Create a dummy table if it doesn't exist for the health check
  db.exec('CREATE TABLE IF NOT EXISTS health_check (id INTEGER PRIMARY KEY, status TEXT)');
  
  const insertStmt = db.prepare("INSERT OR REPLACE INTO health_check (id, status) VALUES (1, 'ok')");
  insertStmt.run();
} catch (err) {
  console.error('Error connecting to the SQLite database:', err.message);
}

app.get('/api/health', (req, res) => {
  try {
    const stmt = db.prepare('SELECT status FROM health_check WHERE id = 1');
    const row = stmt.get();
    
    res.json({ status: 'ok', message: 'Backend and better-sqlite3 Database are healthy', dbPath, data: row });
  } catch(err) {
    return res.status(500).json({ status: 'error', message: 'Database query failed', error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('Scheduler Backend API (SQLite)');
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
