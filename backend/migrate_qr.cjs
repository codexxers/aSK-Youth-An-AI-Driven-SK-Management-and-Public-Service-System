const db = require('better-sqlite3')('data/events.db');

try {
  db.prepare('ALTER TABLE events ADD COLUMN qr_token TEXT').run();
  console.log('Added qr_token column to events table');
} catch (e) {
  console.log('qr_token column might already exist:', e.message);
}

try {
  db.prepare('ALTER TABLE events ADD COLUMN qr_rotated_at TEXT').run();
  console.log('Added qr_rotated_at column to events table');
} catch (e) {
  console.log('qr_rotated_at column might already exist:', e.message);
}

db.close();
console.log('Migration complete.');
