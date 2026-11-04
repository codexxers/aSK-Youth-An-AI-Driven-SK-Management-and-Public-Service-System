import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';

test('Boot migration: converts legacy schema to committee schema safely and idempotently', () => {
  const db = new Database(':memory:');
  
  // Set up old schema
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','chairman','officer','youth')),
      full_name TEXT NOT NULL,
      status TEXT DEFAULT 'active'
    );
    CREATE TABLE events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT
    );
    CREATE TABLE attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      event_id INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(event_id) REFERENCES events(id)
    );
  `);

  // Insert seed data with old roles and categories
  db.prepare("INSERT INTO users (username, password_hash, role, full_name) VALUES ('admin1', 'hash', 'admin', 'Admin User')").run();
  db.prepare("INSERT INTO users (username, password_hash, role, full_name) VALUES ('officer1', 'hash', 'officer', 'Officer One')").run();
  db.prepare("INSERT INTO users (username, password_hash, role, full_name) VALUES ('youth1', 'hash', 'youth', 'Youth One')").run();

  db.prepare("INSERT INTO events (title, category) VALUES ('Health Mission', 'health')").run();
  db.prepare("INSERT INTO events (title, category) VALUES ('Youth Summit', 'unknown_cat')").run();

  db.prepare("INSERT INTO attendance (user_id, event_id) VALUES (2, 1)").run();

  // Run migration logic
  function runMigration(targetDb) {
    const usersCreate = targetDb.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
    const needsUserRebuild = !usersCreate || !usersCreate.sql.includes("'committee'");

    targetDb.pragma('foreign_keys = OFF');

    const migrateTx = targetDb.transaction(() => {
      if (needsUserRebuild) {
        const oldCols = targetDb.pragma('table_info(users)').map(c => c.name);
        const createdExpr = oldCols.includes('created_at') ? 'created_at' : 'CURRENT_TIMESTAMP';
        const updatedExpr = oldCols.includes('updated_at') ? 'updated_at' : 'CURRENT_TIMESTAMP';

        targetDb.exec(`
          CREATE TABLE users_new (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role          TEXT NOT NULL CHECK(role IN ('admin','chairman','committee','officer','youth')),
            committee     TEXT DEFAULT NULL CHECK(committee IS NULL OR committee IN ('health','education','economic','social','peacebuilding','governance','citizenship','environment','global','agriculture')),
            full_name     TEXT NOT NULL,
            status        TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        targetDb.exec(`
          INSERT INTO users_new (id, username, password_hash, role, committee, full_name, status, created_at, updated_at)
          SELECT
            id,
            username,
            password_hash,
            CASE WHEN role = 'officer' THEN 'committee' ELSE role END,
            NULL,
            full_name,
            CASE WHEN status = 1 OR status = '1' OR status = 'active' THEN 'active' ELSE 'inactive' END,
            ${createdExpr},
            ${updatedExpr}
          FROM users;
        `);

        targetDb.exec(`DROP TABLE users;`);
        targetDb.exec(`ALTER TABLE users_new RENAME TO users;`);
      }

      const eventsCols = targetDb.pragma('table_info(events)').map(c => c.name);
      if (!eventsCols.includes('committee')) {
        targetDb.exec("ALTER TABLE events ADD COLUMN committee TEXT DEFAULT 'general'");
      }
      if (!eventsCols.includes('needs_review')) {
        targetDb.exec("ALTER TABLE events ADD COLUMN needs_review INTEGER DEFAULT 0");
      }

      const categoryMap = {
        health: 'health',
        seminar: 'education',
        scholarship: 'education',
        education: 'education',
        livelihood: 'economic',
        economic: 'economic',
        social: 'social',
        governance: 'governance',
        ordinance: 'governance',
        community: 'environment',
        environment: 'environment',
        sports: 'general',
        general: 'general',
        cultural: 'general',
      };
      const knownCategoryCodes = new Set(Object.keys(categoryMap));
      const unmappedEvents = targetDb.prepare("SELECT id, category FROM events WHERE committee IS NULL OR committee = '' OR committee = 'general'").all();
      for (const ev of unmappedEvents) {
        const cat = (ev.category || '').toLowerCase().trim();
        if (knownCategoryCodes.has(cat)) {
          targetDb.prepare('UPDATE events SET committee = ?, needs_review = 0 WHERE id = ?')
            .run(categoryMap[cat], ev.id);
        } else {
          targetDb.prepare("UPDATE events SET committee = 'general', needs_review = 1 WHERE id = ?")
            .run(ev.id);
        }
      }
    });

    migrateTx();
    targetDb.pragma('foreign_keys = ON');

    const fkErrors = targetDb.pragma('foreign_key_check');
    if (fkErrors.length > 0) {
      throw new Error('FK check failed: ' + JSON.stringify(fkErrors));
    }
  }

  // 1. First run
  runMigration(db);

  const users = db.prepare('SELECT id, username, role, committee FROM users ORDER BY id ASC').all();
  assert.equal(users[1].username, 'officer1');
  assert.equal(users[1].role, 'committee');
  assert.equal(users[1].committee, null);

  const events = db.prepare('SELECT id, title, committee, needs_review FROM events ORDER BY id ASC').all();
  assert.equal(events[0].title, 'Health Mission');
  assert.equal(events[0].committee, 'health');
  assert.equal(events[0].needs_review, 0);

  assert.equal(events[1].title, 'Youth Summit');
  assert.equal(events[1].committee, 'general');
  assert.equal(events[1].needs_review, 1);

  // 2. Second run (Idempotency test)
  runMigration(db);
  const users2 = db.prepare('SELECT id, username, role, committee FROM users ORDER BY id ASC').all();
  assert.deepEqual(users, users2, 'Second run preserves exact state');

  db.close();
});

