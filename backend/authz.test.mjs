// backend/authz.test.mjs
// Unit tests for backend/authz.js — Stage 4 of Defense Revisions
// Run: node --test backend/authz.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  isAdmin,
  isChairman,
  isSecretary,
  isCommittee,
  isElevated,
  canReadBudget,
  canWriteBudget,
  canMutateEvent,
  canAssignCommittee,
  getViewerCaps,
  serializeEvent,
} from './authz.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeUser = (role, committee = null, status = 'active') => ({ role, committee, status });
const makeEvent = (committee = 'health', organizer = 'Test Org', contact = '09000000000') => ({
  id: 1,
  title: 'Test Event',
  description: 'Desc',
  committee,
  date: '2026-01-01',
  time: '09:00',
  location: 'Hall',
  status: 'upcoming',
  requirements: null,
  organizer,
  contact,
  attendees: 10,
  male_count: 5,
  female_count: 5,
  staff_count: 2,
  budget_allotted: 50000,
  total_budget: 50000,
});

// ---------------------------------------------------------------------------
// Role predicates
// ---------------------------------------------------------------------------
describe('role predicates', () => {
  it('isAdmin — only admin and system_admin', () => {
    assert.equal(isAdmin(makeUser('admin')), true);
    assert.equal(isAdmin(makeUser('system_admin')), true);
    assert.equal(isAdmin(makeUser('chairman')), false);
    assert.equal(isAdmin(makeUser('secretary')), false);
    assert.equal(isAdmin(makeUser('committee')), false);
    assert.equal(isAdmin(makeUser('youth')), false);
    // null returns null/falsy — coerce to boolean for comparison
    assert.ok(!isAdmin(null));
  });

  it('isChairman — only chairman', () => {
    assert.equal(isChairman(makeUser('chairman')), true);
    assert.equal(isChairman(makeUser('admin')), false);
    assert.equal(isChairman(makeUser('secretary')), false);
  });

  it('isSecretary — only secretary', () => {
    assert.equal(isSecretary(makeUser('secretary')), true);
    assert.equal(isSecretary(makeUser('chairman')), false);
    assert.equal(isSecretary(makeUser('committee')), false);
    assert.ok(!isSecretary(null));
  });

  it('isElevated — admin, chairman, secretary, committee (any logged-in non-youth)', () => {
    assert.equal(isElevated(makeUser('chairman')), true);
    assert.equal(isElevated(makeUser('secretary')), true);
    assert.equal(isElevated(makeUser('admin')), true);
    assert.equal(isElevated(makeUser('committee', 'health')), true);
    assert.ok(!isElevated(makeUser('youth')));
  });
});

// ---------------------------------------------------------------------------
// Budget access — D2: chairman + secretary ONLY
// ---------------------------------------------------------------------------
describe('canReadBudget', () => {
  it('chairman can read budget', () => assert.equal(canReadBudget(makeUser('chairman')), true));
  it('secretary can read budget', () => assert.equal(canReadBudget(makeUser('secretary')), true));
  it('admin CANNOT read budget', () => assert.equal(canReadBudget(makeUser('admin')), false));
  it('committee CANNOT read budget', () => assert.equal(canReadBudget(makeUser('committee', 'health')), false));
  it('youth CANNOT read budget', () => assert.equal(canReadBudget(makeUser('youth')), false));
  it('null user CANNOT read budget', () => assert.ok(!canReadBudget(null)));
});

describe('canWriteBudget', () => {
  it('chairman can write budget', () => assert.equal(canWriteBudget(makeUser('chairman')), true));
  it('secretary can write budget', () => assert.equal(canWriteBudget(makeUser('secretary')), true));
  it('admin CANNOT write budget', () => assert.equal(canWriteBudget(makeUser('admin')), false));
  it('committee CANNOT write budget', () => assert.equal(canWriteBudget(makeUser('committee', 'health')), false));
});

// ---------------------------------------------------------------------------
// Event mutation — D4: assigned committee + chairman; secretary is read-only
// ---------------------------------------------------------------------------
describe('canMutateEvent', () => {
  const ev = makeEvent('health');

  it('chairman can mutate any event', () => assert.equal(canMutateEvent(makeUser('chairman'), ev), true));
  it('committee can mutate own event', () => assert.equal(canMutateEvent(makeUser('committee', 'health'), ev), true));
  it('committee CANNOT mutate another committee event', () => assert.equal(canMutateEvent(makeUser('committee', 'education'), ev), false));
  it('secretary CANNOT mutate any event', () => assert.equal(canMutateEvent(makeUser('secretary'), ev), false));
  it('admin CANNOT mutate any event (read-only)', () => assert.equal(canMutateEvent(makeUser('admin'), ev), false));
  it('youth CANNOT mutate', () => assert.equal(canMutateEvent(makeUser('youth'), ev), false));
});

// ---------------------------------------------------------------------------
// serializeEvent — allowlist serializer; never leaks budget to non-finance
// ---------------------------------------------------------------------------
describe('serializeEvent — public tier', () => {
  const ev = makeEvent();
  const caps = new Set(['public']);
  const result = serializeEvent(ev, caps);

  it('includes public fields', () => {
    assert.ok('id' in result);
    assert.ok('title' in result);
    assert.ok('description' in result);
    assert.ok('committee' in result);
    assert.ok('date' in result);
    assert.ok('status' in result);
  });

  it('excludes control fields', () => {
    assert.equal('organizer' in result, false);
    assert.equal('contact' in result, false);
    assert.equal('attendees' in result, false);
  });

  it('excludes budget fields', () => {
    assert.equal('budget_allotted' in result, false);
    assert.equal('total_budget' in result, false);
  });
});

describe('serializeEvent — control tier (committee own event)', () => {
  const ev = makeEvent();
  const caps = new Set(['public', 'control']);
  const result = serializeEvent(ev, caps);

  it('includes control fields', () => {
    assert.ok('organizer' in result);
    assert.ok('contact' in result);
    assert.ok('attendees' in result);
  });

  it('excludes budget fields (not finance)', () => {
    assert.equal('budget_allotted' in result, false);
    assert.equal('total_budget' in result, false);
  });
});

describe('serializeEvent — finance tier (chairman)', () => {
  const ev = makeEvent();
  const caps = new Set(['public', 'control', 'finance']);
  const result = serializeEvent(ev, caps);

  it('includes budget fields', () => {
    assert.ok('budget_allotted' in result);
  });
});

// ---------------------------------------------------------------------------
// getViewerCaps — returns correct cap set for each role
// ---------------------------------------------------------------------------
describe('getViewerCaps', () => {
  const ev = makeEvent('health');

  it('chairman gets all three tiers', () => {
    const caps = getViewerCaps(makeUser('chairman'), ev);
    assert.ok(caps.has('public'));
    assert.ok(caps.has('control'));
    assert.ok(caps.has('finance'));
  });

  it('secretary gets public + control + finance (canViewEventDetails returns true for secretary)', () => {
    const caps = getViewerCaps(makeUser('secretary'), ev);
    assert.ok(caps.has('public'));
    assert.ok(caps.has('finance'));
    // secretary gets control tier via canViewEventDetails (they can view full event details)
    assert.ok(caps.has('control'));
  });

  it('committee gets public + control for own events', () => {
    const caps = getViewerCaps(makeUser('committee', 'health'), ev);
    assert.ok(caps.has('public'));
    assert.ok(caps.has('control'));
    assert.equal(caps.has('finance'), false);
  });

  it('committee gets only public for other committee events', () => {
    const caps = getViewerCaps(makeUser('committee', 'education'), ev);
    assert.ok(caps.has('public'));
    assert.equal(caps.has('control'), false);
    assert.equal(caps.has('finance'), false);
  });

  it('admin gets public + control (read-only via canViewEventDetails; no budget)', () => {
    const caps = getViewerCaps(makeUser('admin'), ev);
    assert.ok(caps.has('public'));
    // admin gets control tier (can view full details) but cannot mutate events
    assert.ok(caps.has('control'));
    assert.equal(caps.has('finance'), false);
  });

  it('youth gets public only', () => {
    const caps = getViewerCaps(makeUser('youth'), ev);
    assert.ok(caps.has('public'));
    assert.equal(caps.has('control'), false);
    assert.equal(caps.has('finance'), false);
  });

  it('null user gets public only', () => {
    const caps = getViewerCaps(null, ev);
    assert.ok(caps.has('public'));
    assert.equal(caps.has('control'), false);
    assert.equal(caps.has('finance'), false);
  });
});
