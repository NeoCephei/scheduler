const { drizzle } = require('drizzle-orm/better-sqlite3');
const { migrate } = require('drizzle-orm/better-sqlite3/migrator');
const Database = require('better-sqlite3');
const path = require('path');
const schema = require('./schema');

const dbFile = process.env.DB_FILE || 'database.sqlite';
const dbPath = path.resolve(__dirname, '../../', dbFile);

const sqlite = new Database(dbPath);
const db = drizzle(sqlite, { schema });

// Automatically run migrations on startup
const migrationsFolder = path.resolve(__dirname, './migrations');
try {
  migrate(db, { migrationsFolder });
  console.log("Database migrations applied successfully.");
} catch (error) {
  console.error("Migration failed:", error);
}

module.exports = { db, sqlite };
