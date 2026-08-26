const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data', 'events.db'));

try {
  // Begin transaction
  db.exec('BEGIN TRANSACTION');

  // Check if we already migrated
  const info = db.pragma('table_info(event_logs)');
  const hasFirstName = info.some(c => c.name === 'first_name');

  if (!hasFirstName) {
    console.log('Migrating event_logs...');
    // Create temp table
    db.exec(`
      CREATE TABLE IF NOT EXISTS event_logs_new (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id    INTEGER NOT NULL,
        user_id     INTEGER,
        first_name  TEXT,
        mi          TEXT,
        last_name   TEXT,
        suffix      TEXT,
        gender      TEXT,
        address     TEXT,
        timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP,
        status      TEXT DEFAULT 'attended',
        FOREIGN KEY(event_id) REFERENCES events(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
    `);

    // Copy data
    db.exec(`
      INSERT INTO event_logs_new (id, event_id, user_id, timestamp, status)
      SELECT id, event_id, user_id, timestamp, status FROM event_logs;
    `);

    // Drop old and rename new
    db.exec('DROP TABLE event_logs;');
    db.exec('ALTER TABLE event_logs_new RENAME TO event_logs;');

    console.log('Migration successful.');
  } else {
    console.log('Already migrated.');
  }

  db.exec('COMMIT');
} catch (e) {
  db.exec('ROLLBACK');
  console.error('Migration failed:', e);
}
