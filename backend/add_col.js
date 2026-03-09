const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');

try { db.exec('ALTER TABLE areas ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;'); } catch(e) {}
try { db.exec('ALTER TABLE profiles ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;'); } catch(e) {}
try { db.exec('ALTER TABLE shifts ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;'); } catch(e) {}

