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
  // --- Start Idempotency Fix for existing DBs ---
  const tableCheck = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='areas'").get();

  if (tableCheck) {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        hash text NOT NULL,
        created_at integer
      );
    `);
    
    // Hash for 0000_blue_microchip
    const firstMigrationHash = '1a6ad82e67ac857564e9556f43a105dce2ed74ebe1fe8727024cb290420b873c';
    const metadata = sqlite.prepare("SELECT hash FROM __drizzle_migrations WHERE id = 1").get();

    if (!metadata || metadata.hash !== firstMigrationHash) {
      sqlite.prepare("DELETE FROM __drizzle_migrations WHERE id = 1 OR id IS NULL").run();
      sqlite.prepare("INSERT INTO __drizzle_migrations (id, hash, created_at) VALUES (?, ?, ?)").run(1, firstMigrationHash, Date.now());
    }
  }
  // --- End Idempotency Fix ---

  migrate(db, { migrationsFolder });
} catch (error) {
}

module.exports = { db, sqlite };
