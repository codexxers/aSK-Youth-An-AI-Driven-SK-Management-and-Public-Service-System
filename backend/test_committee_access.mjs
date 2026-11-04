// backend/test_committee_access.mjs
// Automated verification suite for Committee Access Control (Revision 2)
// Runs with: node --test backend/test_committee_access.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import {
  COMMITTEES, COMMITTEE_CODES, VALID_EVENT_COMMITTEES, CATEGORY_TO_COMMITTEE, committeeLabel,
  COMMITTEE_EVENT_CATEGORIES, getCategoriesForCommittee
} from './committees.js';
import {
  isAdmin, isChairman, isCommittee, isYouth, isElevated,
  canViewEventDetails, canMutateEvent, canAssignCommittee, eventScopeSql, eventNotice,
  validateUserCommittee, validateEventCommittee
} from './authz.js';

const JWT_SECRET = 'askyouth_super_secret_jwt_key_2026';

// ── 1. Constants Verification ───────────────────────────────────────────────
test('Committees constants: exactly 10 centers, no "special"', () => {
  assert.equal(COMMITTEES.length, 10, 'Must have exactly 10 centers');
  assert.equal(COMMITTEE_CODES.includes('special'), false, 'Special committee must be disregarded');
  assert.equal(COMMITTEE_CODES.includes('health'), true);
  assert.equal(COMMITTEE_CODES.includes('education'), true);
  assert.equal(COMMITTEE_CODES.includes('agriculture'), true);
  assert.equal(VALID_EVENT_COMMITTEES.includes('general'), true, 'Events allow general');
});

// ── 2. User Committee Validation ─────────────────────────────────────────────
test('validateUserCommittee: requires committee iff role is "committee"', () => {
  // Valid committee assignment
  assert.doesNotThrow(() => validateUserCommittee('committee', 'health'));
  assert.doesNotThrow(() => validateUserCommittee('committee', 'education'));

  // Missing committee for committee role
  assert.throws(() => validateUserCommittee('committee', null), /Committee is required/);
  assert.throws(() => validateUserCommittee('committee', ''), /Committee is required/);

  // Invalid code or 'special'
  assert.throws(() => validateUserCommittee('committee', 'special'), /Invalid committee code/);
  assert.throws(() => validateUserCommittee('committee', 'invalid_code'), /Invalid committee code/);

  // Non-committee roles must NOT have a committee
  assert.doesNotThrow(() => validateUserCommittee('admin', null));
  assert.doesNotThrow(() => validateUserCommittee('chairman', null));
  assert.doesNotThrow(() => validateUserCommittee('youth', null));
  assert.throws(() => validateUserCommittee('admin', 'health'), /must not have a committee/);
  assert.throws(() => validateUserCommittee('chairman', 'health'), /must not have a committee/);
});

// ── 3. Authorization Functions (Pure Tests) ──────────────────────────────────
test('canViewEventDetails: matrix verification', () => {
  const adminUser = { id: 1, role: 'admin' };
  const chairmanUser = { id: 2, role: 'chairman' };
  const healthUser = { id: 3, role: 'committee', committee: 'health' };
  const unassignedUser = { id: 4, role: 'committee', committee: null };
  const youthUser = { id: 5, role: 'youth' };
  const guestUser = { id: null, role: 'youth', isGuest: true };

  const healthEvent = { id: 101, title: 'Medical Mission', committee: 'health' };
  const eduEvent = { id: 102, title: 'School Kits', committee: 'education' };
  const generalEvent = { id: 103, title: 'General Assembly', committee: 'general' };

  // Admin & Chairman see everything
  assert.equal(canViewEventDetails(adminUser, healthEvent), true);
  assert.equal(canViewEventDetails(adminUser, eduEvent), true);
  assert.equal(canViewEventDetails(adminUser, generalEvent), true);
  assert.equal(canViewEventDetails(chairmanUser, healthEvent), true);
  assert.equal(canViewEventDetails(chairmanUser, eduEvent), true);
  assert.equal(canViewEventDetails(chairmanUser, generalEvent), true);

  // Health user sees own committee + general, but NOT education
  assert.equal(canViewEventDetails(healthUser, healthEvent), true);
  assert.equal(canViewEventDetails(healthUser, generalEvent), true);
  assert.equal(canViewEventDetails(healthUser, eduEvent), false);

  // Unassigned committee user sees nothing
  assert.equal(canViewEventDetails(unassignedUser, healthEvent), false);
  assert.equal(canViewEventDetails(unassignedUser, generalEvent), false);

  // Youth/Guest never see event details
  assert.equal(canViewEventDetails(youthUser, healthEvent), false);
  assert.equal(canViewEventDetails(youthUser, generalEvent), false);
  assert.equal(canViewEventDetails(guestUser, healthEvent), false);
});

test('canMutateEvent: scoping verification', () => {
  const adminUser = { id: 1, role: 'admin' };
  const chairmanUser = { id: 2, role: 'chairman' };
  const healthUser = { id: 3, role: 'committee', committee: 'health' };

  const healthEvent = { id: 101, committee: 'health' };
  const eduEvent = { id: 102, committee: 'education' };
  const generalEvent = { id: 103, committee: 'general' };

  // Admin & Chairman can mutate all
  assert.equal(canMutateEvent(adminUser, healthEvent), true);
  assert.equal(canMutateEvent(adminUser, generalEvent), true);
  assert.equal(canMutateEvent(chairmanUser, eduEvent), true);

  // Committee user can only mutate their own committee events (NOT general, NOT other committees)
  assert.equal(canMutateEvent(healthUser, healthEvent), true);
  assert.equal(canMutateEvent(healthUser, generalEvent), false, 'Committee user cannot edit general events');
  assert.equal(canMutateEvent(healthUser, eduEvent), false, 'Committee user cannot edit other committee events');
});

test('eventScopeSql: generates correct SQL WHERE fragment', () => {
  const adminUser = { role: 'admin' };
  const healthUser = { role: 'committee', committee: 'health' };
  const unassignedUser = { role: 'committee', committee: null };
  const youthUser = { role: 'youth' };

  assert.deepEqual(eventScopeSql(adminUser), { frag: '1 = 1', params: [] });
  assert.deepEqual(eventScopeSql(healthUser), {
    frag: "(committee = ? OR committee = 'general')",
    params: ['health']
  });
  assert.deepEqual(eventScopeSql(unassignedUser), { frag: '1 = 0', params: [] });
  assert.deepEqual(eventScopeSql(youthUser), { frag: '1 = 0', params: [] });
});

test('eventNotice: returns sanitized public fields only (no budget, attendees, staff)', () => {
  const event = {
    id: 10,
    title: 'Free Dental Checkup',
    date: '2026-11-20',
    time: '09:00',
    location: 'Barangay Health Center',
    committee: 'health',
    description: 'Free dental services for barangay youth.',
    budget_allotted: 50000,
    attendees: 150,
    staff_count: 8,
    contact: 'SK Health Head (09123456789)'
  };

  const notice = eventNotice(event);
  assert.equal(notice.date, '2026-11-20');
  assert.equal(notice.time, '09:00');
  assert.equal(notice.location, 'Barangay Health Center');
  assert.equal(notice.kind, 'Health Committee');
  assert.equal(notice.description, 'Free dental services for barangay youth.');

  // Verify stripped fields
  assert.equal('budget_allotted' in notice, false);
  assert.equal('attendees' in notice, false);
  assert.equal('staff_count' in notice, false);
  assert.equal('contact' in notice, false);
});

// ── 4. DB-backed Dynamic Derivation & Scoping Tests ─────────────────────────
test('Dynamic committee derivation: reassignment takes effect immediately without new JWT', () => {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      role TEXT,
      committee TEXT,
      status TEXT DEFAULT 'active',
      full_name TEXT
    );
    CREATE TABLE events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      committee TEXT
    );
  `);

  db.prepare("INSERT INTO users (username, role, committee, full_name) VALUES ('kagawad1', 'committee', 'health', 'Kagawad One')").run();
  const userId = 1;

  // Insert test events
  db.prepare("INSERT INTO events (title, committee) VALUES ('Health Drive', 'health')").run();
  db.prepare("INSERT INTO events (title, committee) VALUES ('Scholarship Expo', 'education')").run();
  db.prepare("INSERT INTO events (title, committee) VALUES ('Barangay Assembly', 'general')").run();

  // 1. User signs in, JWT created with user.id
  const token = jwt.sign({ id: userId, username: 'kagawad1', role: 'committee' }, JWT_SECRET);
  const decoded = jwt.verify(token, JWT_SECRET);

  // Derive fresh from DB
  let user = db.prepare('SELECT id, username, role, committee, status FROM users WHERE id = ?').get(decoded.id);
  assert.equal(user.committee, 'health');

  // Query events using eventScopeSql
  let scope = eventScopeSql(user);
  let visible = db.prepare(`SELECT title FROM events WHERE ${scope.frag}`).all(...scope.params);
  assert.deepEqual(visible.map(e => e.title), ['Health Drive', 'Barangay Assembly']);

  // 2. Admin reassigns user to 'education' in DB mid-session
  db.prepare("UPDATE users SET committee = 'education' WHERE id = ?").run(userId);

  // Next request arrives with SAME token — user derived fresh from DB
  user = db.prepare('SELECT id, username, role, committee, status FROM users WHERE id = ?').get(decoded.id);
  assert.equal(user.committee, 'education', 'Committee updated immediately from DB');

  scope = eventScopeSql(user);
  visible = db.prepare(`SELECT title FROM events WHERE ${scope.frag}`).all(...scope.params);
  assert.deepEqual(visible.map(e => e.title), ['Scholarship Expo', 'Barangay Assembly'], 'Sees education + general now, health is gone');

  // 3. User unassigned (committee = NULL)
  db.prepare("UPDATE users SET committee = NULL WHERE id = ?").run(userId);
  user = db.prepare('SELECT id, username, role, committee, status FROM users WHERE id = ?').get(decoded.id);
  scope = eventScopeSql(user);
  visible = db.prepare(`SELECT title FROM events WHERE ${scope.frag}`).all(...scope.params);
  assert.equal(visible.length, 0, 'Unassigned user sees zero events');

  db.close();
});

test('Header spoofing defense: X-Role does not override DB-derived role/committee', () => {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      role TEXT,
      committee TEXT,
      status TEXT DEFAULT 'active',
      full_name TEXT
    );
  `);
  db.prepare("INSERT INTO users (username, role, committee, full_name) VALUES ('youth1', 'youth', NULL, 'Youth Member')").run();

  const token = jwt.sign({ id: 1, username: 'youth1', role: 'youth' }, JWT_SECRET);
  const decoded = jwt.verify(token, JWT_SECRET);

  // Attacker sends header X-Role: admin or X-Role: chairman
  const spoofedHeaders = { 'x-role': 'admin' };

  // Our middleware derives user fresh from DB, completely ignoring spoofed header
  const user = db.prepare('SELECT id, username, role, committee, status FROM users WHERE id = ?').get(decoded.id);
  assert.equal(user.role, 'youth', 'DB role is youth');
  assert.equal(isAdmin(user), false, 'Spoofed header grants no admin privileges');
  assert.equal(canViewEventDetails(user, { committee: 'health' }), false);

  db.close();
});

test('Unassigned "Others" events: strictly visible to Chairman and Admin, hidden from Committee and Youth', () => {
  const unassignedEvent = { id: 99, title: 'Mystery Community Project', committee: 'unassigned', category: 'others' };

  const adminUser = { id: 1, role: 'admin' };
  const chairmanUser = { id: 2, role: 'chairman' };
  const healthUser = { id: 3, role: 'committee', committee: 'health' };
  const youthUser = { id: 4, role: 'youth' };

  // Visibility checks
  assert.equal(canViewEventDetails(adminUser, unassignedEvent), true, 'Admin can view unassigned event');
  assert.equal(canViewEventDetails(chairmanUser, unassignedEvent), true, 'Chairman can view unassigned event');
  assert.equal(canViewEventDetails(healthUser, unassignedEvent), false, 'Committee officer CANNOT view unassigned event');
  assert.equal(canViewEventDetails(youthUser, unassignedEvent), false, 'Youth CANNOT view unassigned event');

  // Mutation / Assignment checks
  assert.equal(canMutateEvent(healthUser, unassignedEvent), false, 'Committee officer cannot mutate unassigned event');
  assert.equal(canAssignCommittee(adminUser), true, 'Admin can delegate event to a committee');
  assert.equal(canAssignCommittee(chairmanUser), true, 'Chairman can delegate event to a committee');
  assert.equal(canAssignCommittee(healthUser), false, 'Committee officer cannot delegate event');
  assert.equal(canAssignCommittee(youthUser), false, 'Youth cannot delegate event');

  // Public notice check
  assert.equal(eventNotice(unassignedEvent), null, 'Unassigned event produces null public notice');
});

test('Taxonomy sync: getCategoriesForCommittee returns curated sub-categories', () => {
  const healthCats = getCategoriesForCommittee('health');
  assert.ok(healthCats.some(c => c.code === 'medical_dental_mission'));
  assert.ok(healthCats.some(c => c.code === 'blood_donation'));
  assert.ok(healthCats.some(c => c.code === 'others'));

  const eduCats = getCategoriesForCommittee('education');
  assert.ok(eduCats.some(c => c.code === 'scholarship_grants'));
  assert.ok(eduCats.some(c => c.code === 'school_supplies_assistance'));

  const unassignedCats = getCategoriesForCommittee('unassigned');
  assert.equal(unassignedCats[0].code, 'others');
});

