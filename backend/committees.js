// backend/committees.js
// ─── Single source of truth: 10 Centers of Participation ─────────────────────
// 'special' is NOT listed here by owner decision — disregarded entirely.
// 'general' is a pseudo-code for barangay-wide events, not a committee itself.
// ─────────────────────────────────────────────────────────────────────────────

export const COMMITTEES = [
  { code: 'health',        label: 'Health Committee' },
  { code: 'education',     label: 'Education Committee' },
  { code: 'economic',      label: 'Economic Empowerment Committee' },
  { code: 'social',        label: 'Social Inclusion and Equity Committee' },
  { code: 'peacebuilding', label: 'Peacebuilding and Security Committee' },
  { code: 'governance',    label: 'Governance Committee' },
  { code: 'citizenship',   label: 'Active Citizenship Committee' },
  { code: 'environment',   label: 'Environment Committee' },
  { code: 'global',        label: 'Global Mobility Committee' },
  { code: 'agriculture',   label: 'Agriculture Committee' },
];

/** All valid committee codes (excludes 'general') */
export const COMMITTEE_CODES = COMMITTEES.map(c => c.code);

/** Valid values for events.committee column */
export const VALID_EVENT_COMMITTEES = [...COMMITTEE_CODES, 'general'];

/** Look up a label by code. Returns the code itself if not found. */
export function committeeLabel(code) {
  if (!code || code === 'general') return 'General (Barangay-Wide)';
  return COMMITTEES.find(c => c.code === code)?.label ?? code;
}

/**
 * Old category → committee mapping for the boot migration (D6).
 * Anything not listed here maps to 'general' and is flagged needs_review = 1.
 */
export const CATEGORY_TO_COMMITTEE = {
  health:      'health',
  seminar:     'education',
  scholarship: 'education',
  education:   'education',
  livelihood:  'economic',
  economic:    'economic',
  social:      'social',
  governance:  'governance',
  ordinance:   'governance',
  community:   'environment',
  environment: 'environment',
  sports:      'general',  // sports are barangay-wide by default; admin can re-tag
  general:     'general',
  cultural:    'general',
};

