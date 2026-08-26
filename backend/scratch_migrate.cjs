const db = require('better-sqlite3')('data/events.db');
db.exec('ALTER TABLE users RENAME COLUMN is_active TO status');
db.exec("UPDATE users SET status = 'active' WHERE status = '1'");
db.exec("UPDATE users SET status = 'inactive' WHERE status = '0'");
console.log('Migrated users table');
