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

export function isCommittee(user) {
  return user && user.role === 'committee';
}

export function isYouth(user) {
  return !user || user.role === 'youth' || user.isGuest;
}

export function isElevated(user) {
  return isAdmin(user) || isChairman(user) || isCommittee(user);
}

// ─── Event Access Control ─────────────────────────────────────────────────────

/**
 * Can the user view full event details?
 * - admin/chairman: always
 * - committee with assigned committee: own committee + general events
 * - committee with NULL committee: never (not assigned yet)
 * - youth/guest: never (they get notices via chat/notifications only)
 */
export function canViewEventDetails(user, event) {
  if (!user) return false;
  if (isAdmin(user) || isChairman(user)) return true;
  if (isCommittee(user)) {
    if (!user.committee) return false; // unassigned user
    if (event.committee === 'unassigned') return false; // unassigned event hidden from committee
    return event.committee === 'general' || event.committee === user.committee;
  }
  return false; // youth/guest
}

/**
 * Can the user create or edit this event?
 * Same scope as canViewEventDetails plus the event being mutated must belong
 * to the user's committee (or be general, which only admin/chairman can touch).
 */
export function canMutateEvent(user, event) {
  if (!user) return false;
  if (isAdmin(user) || isChairman(user)) return true;
  if (isCommittee(user)) {
    if (!user.committee) return false;
    if (event.committee === 'unassigned') return false; // committee cannot touch unassigned
    return event.committee === user.committee; // committee users cannot touch 'general' events
  }
  return false;
}

/**
 * Can the user assign or delegate an event to a committee?
 * Strictly restricted to Chairman and Admin.
 */
export function canAssignCommittee(user) {
  return isAdmin(user) || isChairman(user);
}

/**
 * Returns a SQL WHERE fragment and bound params array to scope event queries.
 * Usage: db.prepare(`SELECT * FROM events WHERE ${frag} ORDER BY date ASC`).all(...params)
 */
export function eventScopeSql(user) {
  if (!user) return { frag: '1 = 0', params: [] }; // youth: no rows
  if (isAdmin(user) || isChairman(user)) return { frag: '1 = 1', params: [] };
  if (isCommittee(user)) {
    if (!user.committee) return { frag: '1 = 0', params: [] }; // unassigned
    return {
      frag: "(committee = ? OR committee = 'general')",
      params: [user.committee],
    };
  }
  return { frag: '1 = 0', params: [] }; // fallback
}

/**
 * Returns a minimal notice object for youth/guest consumption.
 * Never includes budget, attendance, or staff counts.
 */
export function eventNotice(event) {
  if (!event || event.committee === 'unassigned') return null; // unassigned events are hidden from public notices
  return {
    date: event.date,
    time: event.time || null,
    location: event.location || null,
    kind: committeeLabel(event.committee),
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
    // admin, chairman, youth must have NULL committee
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

