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

/** Valid values for events.committee column (includes 'general' and 'unassigned') */
export const VALID_EVENT_COMMITTEES = [...COMMITTEE_CODES, 'general', 'unassigned'];

/** Look up a label by code. Returns the code itself if not found. */
export function committeeLabel(code) {
  if (!code || code === 'general') return 'General (Barangay-Wide)';
  if (code === 'unassigned') return 'Unassigned (Pending Delegation)';
  return COMMITTEES.find(c => c.code === code)?.label ?? code;
}

/**
 * Curated Event Categories by Center of Participation.
 * Defines the domain-specific sub-categories for each committee.
 */
export const COMMITTEE_EVENT_CATEGORIES = {
  health: [
    { code: 'medical_dental_mission', label: 'Medical & Dental Mission' },
    { code: 'blood_donation', label: 'Blood Donation Drive' },
    { code: 'mental_health_counseling', label: 'Mental Health Awareness & Counseling' },
    { code: 'anti_substance_abuse', label: 'Anti-Substance Abuse & Drug Prevention' },
    { code: 'nutrition_feeding', label: 'Nutrition & Feeding Program' },
    { code: 'sports_wellness', label: 'Sports, Fitness & Wellness' },
    { code: 'reproductive_health', label: 'Adolescent Reproductive Health (ASRH)' },
    { code: 'others', label: 'Others' }
  ],
  education: [
    { code: 'scholarship_grants', label: 'Scholarship & Educational Grants' },
    { code: 'school_supplies_assistance', label: 'School Supplies & Assistance Distribution' },
    { code: 'als_support', label: 'Alternative Learning System (ALS) Support' },
    { code: 'seminar_literacy_workshop', label: 'Seminars & Literacy Workshops' },
    { code: 'book_drive_library', label: 'Book Drive & Reading Center' },
    { code: 'academic_competitions', label: 'Academic Competitions & Quiz Bees' },
    { code: 'career_guidance', label: 'Career Guidance & College Prep' },
    { code: 'others', label: 'Others' }
  ],
  economic: [
    { code: 'livelihood_training', label: 'Livelihood & Skills Training' },
    { code: 'youth_entrepreneurship', label: 'Youth Entrepreneurship Incubation' },
    { code: 'job_fair_spes', label: 'Job Fair & Summer Job (SPES)' },
    { code: 'tech_voc_workshop', label: 'Technical-Vocational Workshops' },
    { code: 'financial_literacy', label: 'Financial Literacy & Investment' },
    { code: 'others', label: 'Others' }
  ],
  social: [
    { code: 'gad_initiatives', label: 'Gender and Development (GAD)' },
    { code: 'pwd_inclusivity', label: 'PWD Support & Inclusivity' },
    { code: 'marginalized_youth_outreach', label: 'Marginalized & Indigenous Youth Outreach' },
    { code: 'anti_discrimination', label: 'Anti-Bullying & Discrimination Campaigns' },
    { code: 'solo_parents_support', label: 'Solo Parents & Vulnerable Youth Support' },
    { code: 'others', label: 'Others' }
  ],
  peacebuilding: [
    { code: 'anti_illegal_drugs_bida', label: 'Anti-Illegal Drugs Campaign (BIDA/BADAC)' },
    { code: 'disaster_preparedness_drrm', label: 'Disaster Risk Reduction (DRRM) & First Aid' },
    { code: 'community_safety', label: 'Community Safety & Crime Prevention' },
    { code: 'conflict_resolution', label: 'Peace Advocacy & Conflict Mediation' },
    { code: 'cyber_safety', label: 'Cyber-Safety & Online Protection' },
    { code: 'others', label: 'Others' }
  ],
  governance: [
    { code: 'kk_assembly', label: 'Katipunan ng Kabataan (KK) Assembly' },
    { code: 'abyip_cbydp_planning', label: 'ABYIP / CBYDP Planning & Budgeting' },
    { code: 'transparency_accountability', label: 'SK Transparency & Accountability Forum' },
    { code: 'leadership_governance', label: 'Youth Leadership & Governance Training' },
    { code: 'ordinance_policy_drafting', label: 'Local Youth Policy & Ordinance Drafting' },
    { code: 'others', label: 'Others' }
  ],
  citizenship: [
    { code: 'voter_education', label: 'Voter Education & Registration Drive' },
    { code: 'bayanihan_volunteerism', label: 'Youth Volunteerism & Immersion (Bayanihan)' },
    { code: 'bydc_coordination', label: 'Barangay Youth Development Council (BYDC)' },
    { code: 'civic_rights_engagement', label: 'Civic Engagement & Rights Awareness' },
    { code: 'leadership_summit', label: 'Youth Leadership Summit' },
    { code: 'others', label: 'Others' }
  ],
  environment: [
    { code: 'tree_planting', label: 'Tree Planting & Reforestation' },
    { code: 'clean_up_drive', label: 'Barangay & Coastal Clean-Up Drive' },
    { code: 'solid_waste_recycling', label: 'Solid Waste & Zero-Waste Recycling' },
    { code: 'climate_change_action', label: 'Climate Change Awareness' },
    { code: 'ecobrick_upcycling', label: 'Eco-Brick & Upcycling Initiatives' },
    { code: 'others', label: 'Others' }
  ],
  global: [
    { code: 'youth_exchange', label: 'Youth Exchange & Delegations' },
    { code: 'intl_youth_day', label: 'International Youth Day Celebrations' },
    { code: 'global_scholarships_prep', label: 'Global Opportunities & Study Abroad Guidance' },
    { code: 'cultural_arts_exchange', label: 'Cross-Cultural & Arts Exchange' },
    { code: 'language_workshops', label: 'Foreign Language & Cultural Literacy' },
    { code: 'others', label: 'Others' }
  ],
  agriculture: [
    { code: 'urban_gardening_hydroponics', label: 'Urban Gardening & Hydroponics' },
    { code: 'agri_youth_enterprise', label: 'Youth Agri-Business & Crop Production' },
    { code: 'seedling_tree_nursery', label: 'Seedling Nursery & Distribution' },
    { code: 'food_security_organic', label: 'Food Security & Organic Farming' },
    { code: 'agribusiness_mentorship', label: 'Agribusiness Mentorship Program' },
    { code: 'others', label: 'Others' }
  ],
  general: [
    { code: 'linggo_ng_kabataan', label: 'Linggo ng Kabataan' },
    { code: 'sports_tournament', label: 'Inter-Barangay Sports League' },
    { code: 'fiesta_cultural_fest', label: 'Barangay Fiesta & Cultural Festival' },
    { code: 'general_sk_assembly', label: 'General Assembly & Town Hall' },
    { code: 'community_outreach', label: 'Barangay-Wide Relief & Outreach' },
    { code: 'others', label: 'Others' }
  ]
};

/** Return categories for a given committee code, falling back to general categories */
export function getCategoriesForCommittee(committeeCode) {
  if (!committeeCode || committeeCode === 'unassigned') {
    return [{ code: 'others', label: 'Others (Pending Assignment)' }];
  }
  return COMMITTEE_EVENT_CATEGORIES[committeeCode] || COMMITTEE_EVENT_CATEGORIES.general;
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

