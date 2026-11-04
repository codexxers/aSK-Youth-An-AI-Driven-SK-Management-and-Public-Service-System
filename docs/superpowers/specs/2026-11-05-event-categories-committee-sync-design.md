# Event Categories & Committee Sync Design Specification

**Date:** 2026-11-05  
**Topic:** Syncing Event Categories with Committee Centers of Participation, SQLite CHECK Integrity, and "Others" Delegation Workflow  
**Status:** Approved by User  

---

## 1. Overview & Objectives

In the aSK-Youth system, user roles include `admin`, `chairman`, `committee`, and `youth`. Committee accounts are tied to one of the 10 National Youth Commission (NYC) Centers of Participation (e.g. Health, Education, Environment, Agriculture, etc.).

Previously, event categories remained static legacy values (`sports`, `seminar`, `scholarship`, `assembly`, `community`, `livelihood`, `general`, `cultural`, `health`, `others`) completely detached from the assigned committee.

This specification establishes:
1. **Curated Event Sub-Categories**: Each of the 10 Centers of Participation plus `general` has a curated, domain-specific taxonomy of event categories.
2. **Dynamic Dependent Dropdowns**: In the event creation and edit modal, selecting a Committee Scope dynamically filters the Category dropdown to that committee's specific categories.
3. **Database Integrity via SQLite CHECK**: The `events` table is reinforced with an SQLite `CHECK` constraint ensuring `committee` conforms to valid codes (`health`, `education`, `economic`, `social`, `peacebuilding`, `governance`, `citizenship`, `environment`, `global`, `agriculture`, `general`, `unassigned`).
4. **"Others" Delegation & Visibility Gate**:
   - If an event is created under category `"others"` with `committee = 'unassigned'`, it is **strictly visible only to Chairman and Admin**.
   - Committee officers and Youth cannot see unassigned events.
   - Both Chairman and Admin have exclusive authorization to delegate/assign the event to one of the 10 committees.
   - Once assigned, the event transitions to the delegated committee and immediately becomes visible and manageable by officers of that committee.

---

## 2. Taxonomy of Categories by Center of Participation

Defined centrally in `backend/committees.js` and served via `GET /api/committees`:

```javascript
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
```

---

## 3. Database Schema & Migration Specification

### Table Definition with CHECK Constraint:
```sql
CREATE TABLE events_new (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  title                TEXT NOT NULL,
  description          TEXT,
  committee            TEXT NOT NULL DEFAULT 'general' CHECK(committee IN ('health','education','economic','social','peacebuilding','governance','citizenship','environment','global','agriculture','general','unassigned')),
  category             TEXT NOT NULL,
  category_other_label TEXT,
  date                 TEXT,
  time                 TEXT DEFAULT '',
  location             TEXT,
  organizer            TEXT,
  status               TEXT DEFAULT 'upcoming',
  requirements         TEXT,
  contact              TEXT,
  attendees            INTEGER DEFAULT 0,
  male_count           INTEGER DEFAULT 0,
  female_count         INTEGER DEFAULT 0,
  staff_count          INTEGER,
  budget_allotted      REAL DEFAULT 0,
  needs_review         INTEGER DEFAULT 0,
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Idempotent Boot Migration:
1. Detect whether `events` table definition in `sqlite_master` already contains the `CHECK(committee IN ...)` constraint.
2. If rebuild is needed:
   - Begin single database transaction.
   - Create `events_new` with the complete schema and CHECK constraint.
   - Copy existing rows, mapping any legacy null/empty `committee` to `'general'`.
   - Drop old `events` and rename `events_new` to `events`.
   - Run `PRAGMA foreign_key_check` to ensure relational integrity with `event_logs`.
   - Commit transaction and log to `system_logs`.

---

## 4. Authorization & Scoping (`backend/authz.js`)

1. **`canViewEventDetails(event, user)`**:
   - `admin` / `chairman`: Always `true` (can view all events, including `unassigned`).
   - `committee`:
     - If `event.committee === 'unassigned'`: **`false`** (hidden until assigned).
     - If `event.committee === user.committee` OR `event.committee === 'general'`: **`true`**.
     - Otherwise: `false`.
   - `youth` / `guest`: Always `false` (public notice date + kind only; unassigned events are excluded from notices).
2. **`canMutateEvent(event, user)`**:
   - `admin` / `chairman`: Always `true`.
   - `committee`: Can only mutate if `event.committee === user.committee`. Cannot mutate or assign `unassigned` events.
3. **`canAssignCommittee(user)`**:
   - Returns `true` if `user.role === 'admin' || user.role === 'chairman'`.
4. **`eventScopeSql(user)`**:
   - `admin` / `chairman`: `(1=1)`
   - `committee`: `(committee = ? OR committee = 'general')` (bind: `user.committee`), ensuring `unassigned` events are automatically excluded from SQL queries.
   - `youth`: Handled via date + kind notices, direct routes 404.

---

## 5. Frontend UI/UX Specifications (`frontend/src/`)

### 1. `EventFormModal`
- **Dynamic Dependent Select**:
  - Whenever `form.committee` changes, the `Category` select re-populates with `COMMITTEE_EVENT_CATEGORIES[form.committee]`.
  - If `form.category === 'others'`, the `"Specify Custom Event Category"` text field (`form.category_other_label`) appears with placeholder `e.g. Blood Donation Drive`.
- **Role Scoping**:
  - Committee users have their committee scope locked and badged (`authUser.committee`).
  - Chairman and Admin have a full committee scope selector, including `Unassigned (Pending Committee Delegation)`.

### 2. Events List & Event Details
- **Unassigned Badge**:
  - Events with `committee === 'unassigned'` display an amber warning badge: `⚠️ Unassigned Committee (Pending Delegation)`.
- **Delegation Control (Chairman & Admin)**:
  - Inside the event card/modal, Chairman and Admin see a quick delegation dropdown/button: `Assign Committee → [Select Committee]`.
  - Submitting delegates the event, updates `committee`, logs an audit entry, and immediately makes it visible to that committee.

---

## 6. Implementation Stages & Verification Gates

- **Stage 1 (Backend)**: Add `COMMITTEE_EVENT_CATEGORIES` to `committees.js`, update `GET /api/committees`, add boot migration in `server.js`, and enhance `authz.js` scoping.
- **Stage 2 (Frontend)**: Update `EventFormModal` with dynamic category binding, custom label input, and unassigned status badge.
- **Stage 3 (Testing)**: Unit tests with `node:test` covering:
  - Committee user cannot see `unassigned` events.
  - Chairman and Admin can see and delegate `unassigned` events.
  - SQLite CHECK constraint validates committee codes.
  - Frontend production build verification with `npm --prefix frontend run build`.

