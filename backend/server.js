require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sqlite, db } = require('./src/db');

const app = express();
const port = process.env.PORT || 3001;
const dbFile = process.env.DB_FILE || './database.sqlite';
const dbPath = path.resolve(__dirname, dbFile);

const areasRouter = require('./src/routes/areas');
const shiftsRouter = require('./src/routes/shifts');
const profilesRouter = require('./src/routes/profiles');

app.use(cors());
app.use(express.json());

// Create a dummy table if it doesn't exist for the health check
try {
  sqlite.exec('CREATE TABLE IF NOT EXISTS health_check (id INTEGER PRIMARY KEY, status TEXT)');
  const insertStmt = sqlite.prepare("INSERT OR REPLACE INTO health_check (id, status) VALUES (1, 'ok')");
  insertStmt.run();
} catch (err) {
  console.error('Error ensuring SQLite health check:', err.message);
}

app.get('/api/health', (req, res) => {
  try {
    const stmt = sqlite.prepare('SELECT status FROM health_check WHERE id = 1');
    const row = stmt.get();
    
    res.json({ status: 'ok', message: 'Backend, better-sqlite3 and Drizzle are healthy', data: row });
  } catch(err) {
    return res.status(500).json({ status: 'error', message: 'Database query failed', error: err.message });
  }
});

app.use('/api/areas', areasRouter);
app.use('/api/shifts', shiftsRouter);
app.use('/api/profiles', profilesRouter);

app.get('/', (req, res) => {
  res.send('Scheduler Backend API');
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
  });
}

module.exports = app;
