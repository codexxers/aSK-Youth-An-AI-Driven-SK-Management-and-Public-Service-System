import React, { useState, useEffect } from 'react';

// In-memory cache for committees fetched from GET /api/committees
let cachedCommittees = null;
let pendingFetch = null;

export async function fetchCommittees(apiBase = '') {
  if (cachedCommittees) return cachedCommittees;
  if (pendingFetch) return pendingFetch;

  pendingFetch = (async () => {
    try {
      const res = await fetch(`${apiBase}/api/committees`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          cachedCommittees = data;
          return cachedCommittees;
        }
      }
    } catch (e) {
      console.warn('[CommitteeSelect] Failed to fetch committees, using fallback:', e.message);
    }
    return [
      { code: 'health', label: 'Health Committee' },
      { code: 'education', label: 'Education Committee' },
      { code: 'economic', label: 'Economic Empowerment Committee' },
      { code: 'social', label: 'Social Inclusion and Equity Committee' },
      { code: 'peacebuilding', label: 'Peacebuilding and Security Committee' },
      { code: 'governance', label: 'Governance Committee' },
      { code: 'citizenship', label: 'Active Citizenship Committee' },
      { code: 'environment', label: 'Environment Committee' },
      { code: 'global', label: 'Global Mobility Committee' },
      { code: 'agriculture', label: 'Agriculture Committee' }
    ];
  })();

  const result = await pendingFetch;
  pendingFetch = null;
  return result;
}

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

export function getCategoriesForCommittee(committeeCode) {
  if (!committeeCode || committeeCode === 'unassigned') {
    return [{ code: 'others', label: 'Others (Pending Delegation)' }];
  }
  return COMMITTEE_EVENT_CATEGORIES[committeeCode] || COMMITTEE_EVENT_CATEGORIES.general;
}

export default function CommitteeSelect({
  value,
  onChange,
  apiBase = '',
  required = false,
  disabled = false,
  includeGeneral = false,
  includeUnassigned = false,
  generalLabel = 'General (Barangay-Wide)',
  unassignedLabel = 'Unassigned (Pending Delegation)',
  placeholder = '-- Select Committee --',
  className = '',
  id = 'committee-select',
  name = 'committee'
}) {
  const [committees, setCommittees] = useState(cachedCommittees || []);
  const [loading, setLoading] = useState(!cachedCommittees);

  useEffect(() => {
    let isMounted = true;
    fetchCommittees(apiBase).then(list => {
      if (isMounted) {
        // Exclude 'special' committee if present anywhere per owner decision
        const filtered = list.filter(c => c.code !== 'special');
        setCommittees(filtered);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [apiBase]);

  const defaultCls = "w-full bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-200 focus:border-blue-600 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none transition-all shadow-sm font-medium";

  return (
    <div className="relative">
      <select
        id={id}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        required={required}
        disabled={disabled || loading}
        className={`${defaultCls} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <option value="">{loading ? 'Loading committees...' : placeholder}</option>
        {includeGeneral && (
          <option value="general" className="font-semibold text-slate-900">
            {generalLabel}
          </option>
        )}
        {includeUnassigned && (
          <option value="unassigned" className="font-semibold text-amber-700">
            {unassignedLabel}
          </option>
        )}
        {committees.map(c => (
          <option key={c.code} value={c.code} className="font-medium text-slate-900">
            {c.label}
          </option>
        ))}
      </select>
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

