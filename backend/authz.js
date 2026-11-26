// backend/authz.js
// ─── Pure Authorization Functions — no DB writes, no side effects ─────────────
// All functions derive permissions from the user object (fetched fresh from DB).
// The 'user' object has shape: { id, username, role, committee, status, full_name }
// ─────────────────────────────────────────────────────────────────────────────

import { COMMITTEE_CODES, VALID_EVENT_COMMITTEES, committeeLabel } from './committees.js';

// ─── Role Helpers ─────────────────────────────────────────────────────────────

export function isAdmin(user) {
  return user && (user.role === 'admin' || user.role === 'system_admin');
}

export function isChairman(user) {
  return user && user.role === 'chairman';
}

export function isSecretary(user) {
  return user && user.role === 'secretary';
}

export function isCommittee(user) {
  return user && user.role === 'committee';
}

export function isYouth(user) {
  return !user || user.role === 'youth' || user.isGuest;
}

export function isElevated(user) {
  return isAdmin(user) || isChairman(user) || isSecretary(user) || isCommittee(user);
}

// ─── Finance / Budget Access ──────────────────────────────────────────────────

/**
 * Can this user READ budget fields?
 * Chairman and Secretary only. Admin is intentionally excluded (D2).
 */
export function canReadBudget(user) {
  return isChairman(user) || isSecretary(user);
}

/**
 * Can this user WRITE budget fields on an event?
 * Same as read — chairman and secretary only.
 */
export function canWriteBudget(user) {
  return isChairman(user) || isSecretary(user);
}

// ─── Event Access Control ─────────────────────────────────────────────────────

/**
 * Can the user view full event details (control tier)?
 * - admin/chairman/secretary: always
 * - committee with assigned committee: own committee + general events
 * - committee with NULL committee: never (not assigned yet)
 * - youth/guest: never (they get notices via chat/notifications only)
 */
export function canViewEventDetails(user, event) {
  if (!user) return false;
  if (isAdmin(user) || isChairman(user) || isSecretary(user)) return true;
  if (isCommittee(user)) {
    if (!user.committee) return false; // unassigned user
    if (event.committee === 'unassigned') return false; // unassigned event hidden from committee
    return event.committee === 'general' || event.committee === user.committee;
  }
  return false; // youth/guest
}

/**
 * Can the user create or edit this event?
 * - Chairman: all events including general
 * - Committee: own committee only (not general, not other committees)
 * - Secretary/Admin: read-only — cannot mutate events
 */
export function canMutateEvent(user, event) {
  if (!user) return false;
  if (isChairman(user)) return true;
  if (isCommittee(user)) {
    if (!user.committee) return false;
    if (event.committee === 'unassigned') return false;
    return event.committee === user.committee;
  }
  return false; // admin and secretary are read-only on events (D4)
}

/**
 * Can the user assign or delegate an event to a committee?
 * Strictly restricted to Chairman only (admin can read but not delegate — D4).
 */
export function canAssignCommittee(user) {
  return isChairman(user);
}

/**
 * Returns a SQL WHERE fragment and bound params array to scope event queries.
 * Usage: db.prepare(`SELECT * FROM events WHERE ${frag} ORDER BY date ASC`).all(...params)
 */
export function eventScopeSql(user) {
  if (!user) return { frag: '1 = 0', params: [] }; // youth: no rows
  if (isAdmin(user) || isChairman(user) || isSecretary(user)) return { frag: '1 = 1', params: [] };
  if (isCommittee(user)) {
    if (!user.committee) return { frag: '1 = 0', params: [] }; // unassigned
    return {
      frag: "(committee = ? OR committee = 'general')",
      params: [user.committee],
    };
  }
  return { frag: '1 = 0', params: [] }; // fallback
}

// ─── Event Serializer — Allowlist by Construction ─────────────────────────────

/**
 * PUBLIC tier fields — safe for anyone, including unauthenticated visitors.
 * Never includes budget, attendance counts, organizer, contact, or QR data.
 */
const PUBLIC_FIELDS = [
  'id', 'title', 'description', 'date', 'time', 'location', 'status',
  'requirements', 'committee', 'category',
];

/**
 * CONTROL tier extra fields — committee user (own events) + chairman.
 * Adds attendance data, organizer, contact.
 */
const CONTROL_EXTRA = [
  'organizer', 'contact',
  'attendees', 'male_count', 'female_count', 'staff_count',
  'category_other_label', 'needs_review', 'qr_token', 'qr_rotated_at',
];

/**
 * FINANCE tier extra fields — chairman + secretary only.
 */
const FINANCE_EXTRA = ['budget_allotted'];

/**
 * Derive the viewer's capability set for a specific event.
 * Returns a Set containing: 'public', 'control', 'finance'
 */
export function getViewerCaps(user, event) {
  const caps = new Set(['public']);
  if (!user) return caps;

  if (canViewEventDetails(user, event)) {
    caps.add('control');
  }
  if (canReadBudget(user)) {
    caps.add('finance');
  }
  return caps;
}

/**
 * Serialize an event row to only the fields the viewer is allowed to see.
 * @param {object} event - Raw DB row
 * @param {Set<string>} caps - Set of 'public' | 'control' | 'finance'
 * @returns {object} Safe serialized event
 */
export function serializeEvent(event, caps) {
  const out = {};
  for (const field of PUBLIC_FIELDS) {
    if (field in event) out[field] = event[field];
  }
  // Add the committee label as a human-readable string
  out.committee_label = committeeLabel(event.committee);

  if (caps.has('control')) {
    for (const field of CONTROL_EXTRA) {
      if (field in event) out[field] = event[field];
    }
  }
  if (caps.has('finance')) {
    for (const field of FINANCE_EXTRA) {
      if (field in event) out[field] = event[field];
    }
  }
  return out;
}

/**
 * Returns a minimal notice object for youth/guest consumption.
 * Never includes budget, attendance, or staff counts.
 */
export function eventNotice(event) {
  if (!event || event.committee === 'unassigned') return null; // unassigned events are hidden from public notices
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    time: event.time || null,
    location: event.location || null,
    status: event.status || 'upcoming',
    requirements: event.requirements || null,
    kind: committeeLabel(event.committee),
    committee_label: committeeLabel(event.committee),
    description: event.description
      ? event.description.substring(0, 200)  // safe snippet, no classified info
      : null,
  };
}

// ─── User Committee Validation ────────────────────────────────────────────────

/**
 * Validates that committee field is consistent with role.
 * Throws an Error with a user-facing message if invalid.
 * @param {string} role - The role being assigned
 * @param {string|null} committee - The committee code being assigned
 */
export function validateUserCommittee(role, committee) {
  if (role === 'committee') {
    if (!committee) {
      throw new Error('Committee is required when role is "committee". Select one of the 10 Centers of Participation.');
    }
    if (!COMMITTEE_CODES.includes(committee)) {
      throw new Error(`Invalid committee code: "${committee}". Must be one of: ${COMMITTEE_CODES.join(', ')}`);
    }
  } else {
    // admin, chairman, secretary, youth must have NULL committee
    if (committee) {
      throw new Error(`Role "${role}" must not have a committee assigned. Only "committee" role users have a committee.`);
    }
  }
}

/**
 * Validate an event's committee field.
 */
export function validateEventCommittee(committee) {
  if (!committee) return; // will default to 'general'
  if (!VALID_EVENT_COMMITTEES.includes(committee)) {
    throw new Error(`Invalid event committee: "${committee}". Must be one of: ${VALID_EVENT_COMMITTEES.join(', ')}`);
  }
}
