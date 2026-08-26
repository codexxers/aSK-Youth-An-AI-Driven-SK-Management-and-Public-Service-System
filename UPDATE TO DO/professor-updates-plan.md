# aSK//YOUTH.AI — Phase 6 Update Plan (Professor-Mandatory)
**Date:** 2026-05-14  
**MD file:** `ASYNC_UPDATE_PLAN.md` (in project root)  
**Backup confirmed:** Yes

---

> [!CAUTION]
> **PROTECTED FEATURES — NEVER REMOVE OR BREAK.** Every item in the table below must exist and function correctly after every single phase. If any phase touches a file containing a protected feature, verify that feature still works before marking the phase done.

## Protected Features Registry

### Backend (`backend/server.js`)

| Route / System | Rule |
|----------------|------|
| `POST /api/chat/stream` — SSE streaming Qwen 2.5 7B | Never touch internals |
| `GET /api/events` — list with `status`/`category` filters | Only add optional params |
| `POST /api/events` — create event | Only extend allowed field list |
| `PATCH /api/events/:id` — update event | Only extend allowed field list |
| `DELETE /api/events/:id` — delete event | Untouched |
| `POST /api/events/parse-document` — AI event field extraction | Never touch |
| `GET /api/analytics/events` — types: `event`,`monthly`,`status`,`attendance` | Only add new type cases |
| `POST /api/export/document` — DOCX/PDF with SK letterhead | Only extend; never alter letterhead |
| `POST /api/generate-document` — template doc generator | Never touch |
| `GET /health` + `GET /ready` — health/readiness checks | Never touch |
| `HNSWVectorStore` class — RAG vector index | Never touch class internals |
| SQLite `events` table columns (all 15 existing) | Never drop or rename; only ADD via migration |
| SQLite `chunk_embeddings` table | Never touch |
| `embedBatch()` / `embed()` / `cosineSim()` | Never touch |
| `acquireGenLock()` / `releaseGenLock()` | Never touch |
| `loadSystemPrompt()` / `loadRewriterPrompt()` | Never touch |
| `stripMarkdown()` (Phase 5) | Never remove |
| Multer upload config — MIME/ext/size/count validation | Never relax |
| Rate limiter 60 req/min | Never remove |
| Trust proxy config | Never remove |
| CORS `CORS_ORIGINS` allowlist | Never widen to `*` |

### Frontend (`askyouth-web-only/src/App.jsx`)

| Component / Feature | Rule |
|--------------------|------|
| `ExportResponseButton` (Phase 5) | Never remove |
| `SourcesPanel` + `retrievedChunks` in message (Phase 5) | Never remove |
| `EventsAnalyticsModule` — charts + manage events | Never remove; only add tabs/filters |
| `EventFormModal` — event create/edit + document import | Never remove; only add fields |
| `ReportsModule` — SK doc generator (Resolution/Minutes/Certificate) | Never remove or alter template logic |
| `sendMessage()` + SSE reader loop + `streamPhase` state | Never touch streaming logic |
| Thread management + `localStorage` persistence | Never touch |
| File upload / drag-drop / clipboard paste (max 5 files) | Never touch |
| `ChatbotInactivePage` — backend-down fallback | Never remove |
| `fetchBackendHealth()` polling every 30s | Never remove |
| Live clock `formatClock()` in header | Never remove |
| Sidebar thread list (pin/rename/delete/active highlight) | Never touch |
| Sidebar module nav (`currentView` state) | Only add items; never remove |
| `handleExport()` — official doc export handler | Never remove or rename |
| `<think>` tag extraction from assistant messages | Never touch |
| `<official_document>` fault-tolerant regex extraction | Never touch |

### Infrastructure

| Item | Rule |
|------|------|
| `askyouth-web-only/` as Vercel deploy source | Never change deploy path |
| `VITE_BACKEND_URL` env var | Never hardcode in source |
| `start_system.bat` / `run_cloudflare_tunnel.bat` | Never modify without tunnel test |
| `response_styles/response_style.prompt.md` | Never edit without explicit user instruction |
| SQLite `events.db` seed data | Must survive all migrations |

---

> [!IMPORTANT]
> **Zero credentials in frontend.** All auth is backend-only (bcrypt + JWT). Frontend only stores the JWT token in `sessionStorage` and sends it as `Authorization: Bearer <token>`. No passwords, secrets, or roles are hardcoded in `App.jsx` or any client file.

> [!NOTE]
> Every phase ends with updating `CONTEXT.md` (append to change log) and `SYSTEM_CONTEXT.md` (update relevant sections). Neither file loses existing content.

---

## Roles

| Role | Access |
|------|--------|
| `admin` | Everything: CRUD users, view system logs, all modules |
| `chairman` | Same as admin **except** cannot create/edit/delete users — read-only user list |
| `officer` | Events CRUD, suggestions review, chat |
| `youth` | Chat, submit suggestions, view events read-only |

---

## Feature 1 — Login Page + Authentication System

### Architecture
- **Backend**: `users` SQLite table, passwords hashed with `bcryptjs` (cost ≥ 12), JWT signed with `JWT_SECRET` from `backend/.env`
- **Frontend**: Login form only — no credentials stored. POST to `/api/auth/login`, store returned JWT in `sessionStorage`, attach as `Authorization: Bearer <token>` on all subsequent API calls
- **No credentials in any client-side file — ever**

### New NPM packages (`backend/package.json`)
- `bcryptjs` — password hashing
- `jsonwebtoken` — JWT sign/verify

### New SQLite tables
```sql
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK(role IN ('admin','chairman','officer','youth')),
  full_name     TEXT NOT NULL,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS token_blocklist (
  token_jti  TEXT PRIMARY KEY,
  expired_at INTEGER NOT NULL
);
```

### New backend routes
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/auth/login` | None | Verify credentials, return JWT + user info |
| `POST` | `/api/auth/logout` | Bearer | Add JTI to blocklist |
| `GET` | `/api/auth/me` | Bearer | Verify token, return current user |
| `GET` | `/api/users` | admin/chairman | List users (chairman: read-only) |
| `POST` | `/api/users` | admin only | Create user |
| `PATCH` | `/api/users/:id` | admin only | Update user (role, name, active) |
| `DELETE` | `/api/users/:id` | admin only | Deactivate/delete user |

### Auth middleware
```js
function requireAuth(roles = []) {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    // verify JWT signature, check blocklist, check role array
    // attach req.user = { id, username, role, full_name }
    next();
  };
}
```

### Frontend (`App.jsx`)
- `LoginPage` component — dark glassmorphic form, username + password inputs
- `useAuth` state in `App()` — reads token from `sessionStorage`, calls `/api/auth/me` to validate on mount
- If no valid token → render `<LoginPage />`
- All fetch calls get `Authorization: Bearer ${token}` header
- Sidebar: role-guarded nav items
- Logout: clear `sessionStorage`, call `POST /api/auth/logout`, reset auth state
- Header: display `full_name` + role badge

### Seed on first startup
Default accounts are seeded server-side only if `users` table is empty. Passwords are printed to server console **once** on first boot and **never** logged again. `JWT_SECRET` must be set in `backend/.env`.

---

## Feature 2 — SK-Patterned Events

### What it does
Aligns the events module with official SK program lifecycle naming per DILG/DepEd. Adds `fiscal_year` and `sk_program` DB columns (additive migration), updates category list to 10 SK-aligned types, adds SK Program Cluster dropdown to the event form.

### Backend changes (`server.js`)
Additive only — extend `migrationColumns` array:
```js
{ name: 'fiscal_year', sql: "ALTER TABLE events ADD COLUMN fiscal_year INTEGER" },
{ name: 'sk_program',  sql: "ALTER TABLE events ADD COLUMN sk_program TEXT DEFAULT 'general'" },
```
Update allowed fields in `POST /api/events` and `PATCH /api/events/:id`.  
Update `GET /api/events` to accept `fiscal_year` and `sk_program` filter params.

### Frontend changes (`App.jsx`)
```js
const EVENT_CATEGORIES = [
  'education-training','health-wellness','sports-recreation','livelihood-economic',
  'environmental','values-formation','peace-order','assembly','scholarship','community-service'
];

const SK_PROGRAMS = [
  { id: 'kabataan-bayan',      label: 'Kabataan Para sa Bayan' },
  { id: 'kabataan-atleta',     label: 'Kabataang Atleta' },
  { id: 'kabataan-negosyante', label: 'Kabataang Negosyante' },
  { id: 'kabataan-kalikasan',  label: 'Kabataang Iniingatan ang Kalikasan' },
  { id: 'kabataan-kalusugan',  label: 'Kabataang Malusog' },
  { id: 'sk-assembly',         label: 'SK Assembly / Governance' },
  { id: 'scholarship',         label: 'Scholarship / Educational' },
  { id: 'general',             label: 'General Community Service' },
];
```
Update `EMPTY_EVENT_FORM`, add `fiscal_year` and `sk_program` fields to `EventFormModal`, add `sk_program` chip to event cards.

---

## Feature 3 — Events Enhancements

### What it does
Adds fiscal year filter, SK program filter, and "This Week" quick-filter button to the Manage Events toolbar. Shows `sk_program` chip on each event card.

### Changes
- Backend: extend `GET /api/events` query builder with `fiscal_year` and `sk_program` params (additive conditions)
- Frontend: add `filterYear` + `filterSkProgram` states, corresponding `<select>` dropdowns in toolbar, `sk_program` chip on cards, "This Week" filter button

---

## Feature 4 — Yearly Events View

### What it does
A new "Yearly Overview" chart tab inside `EventsAnalyticsModule`. Shows a Plotly heatmap (rows = SK program clusters, columns = months Jan–Dec, cell = event count) plus a chronological timeline list of all events in the selected fiscal year grouped by month. Fiscal year selector controls the data.

### Backend changes (`server.js`)
Add `type=yearly` case to the existing `/api/analytics/events` handler:
- Accept `year` query param (default: current year)
- Query events grouped by `sk_program` and month
- Return `{ chart: <Plotly heatmap JSON>, timeline: [event rows sorted by date], stats: { total, year } }`

### Frontend changes (`App.jsx`)
- Add `{ id: 'yearly', label: '📅 Yearly Overview' }` to `chartTabs`
- When `chartType === 'yearly'`: render fiscal year selector, Plotly heatmap, timeline list below

---

## Feature 5 — Mobile View (Responsive/Adaptive)

### What it does
Makes the app fully adaptive to any device screen: phones (375px+), tablets (768px+), desktops (1024px+). Mobile-first approach — no horizontal scroll, touch-friendly targets, overlay sidebar, fixed bottom nav bar.

### Changes (`App.jsx` + `index.css`)

**Sidebar (mobile):**
- `< md`: `position: fixed`, full height, z-50, slides from left, dark backdrop overlay closes on tap
- `≥ md`: current fixed-width column behavior unchanged

**Mobile bottom nav bar** (`md:hidden`, fixed bottom, role-filtered icons):
- Replaces sidebar module switcher on phones
- Shows icons + labels for accessible modules

**Content adjustments:**
- Chat area: `pb-20 md:pb-0` (safe space above bottom nav)
- Event cards: `grid-cols-1 md:grid-cols-auto`
- Admin stat cards: `grid-cols-2 sm:grid-cols-4`
- Modals: `w-full mx-4` on mobile

**Touch targets:** All interactive elements get `min-h-[44px]` on mobile

---

## Feature 6 — Suggestions Module

### What it does
Feedback channel: Youth submits suggestions; Officers/Chairperson/Admin review and respond. All roles see the module but with different views.

### New SQLite table
```sql
CREATE TABLE IF NOT EXISTS suggestions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  content        TEXT NOT NULL,
  category       TEXT DEFAULT 'general',
  submitter_name TEXT DEFAULT 'Anonymous',
  submitter_id   INTEGER,
  status         TEXT DEFAULT 'pending' CHECK(status IN ('pending','reviewed','resolved')),
  admin_response TEXT,
  responded_by   TEXT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### New routes
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/suggestions` | Any authenticated | Submit suggestion |
| `GET` | `/api/suggestions` | Any authenticated | List (own for youth, all for officer+) |
| `PATCH` | `/api/suggestions/:id` | officer/chairman/admin | Update status + response |

### Frontend (`App.jsx`)
- `SuggestionsModule` component
- **Youth view**: submit form (content, category, optional name) + "My Suggestions" list with status badges
- **Officer/Admin view**: full table — all suggestions, status badges (pending=amber, reviewed=blue, resolved=green), "Reply" modal for `admin_response` + status change
- Nav item: `{ id: 'suggestions', label: 'Suggestions', emoji: '💬' }` — all roles

---

## Feature 7 — Admin Dashboard + System Logs

### What it does
Protected dashboard for `admin` and `chairman`. Provides live analytics (stats, charts, activity feed), system logs (admin only), and user management (admin CRUD, chairman read-only). The existing `ReportsModule` document generator is **unchanged**.

### New SQLite table
```sql
CREATE TABLE IF NOT EXISTS system_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  actor      TEXT NOT NULL,
  role       TEXT NOT NULL,
  action     TEXT NOT NULL,
  target     TEXT,
  details    TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

`writeLog()` called on: login success/fail, logout, event create/update/delete, suggestion status change, user create/update/delete.

### New routes
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/admin/stats` | admin/chairman | Aggregated counts |
| `GET` | `/api/admin/logs` | admin only | Paginated log entries |
| `GET` | `/api/admin/participation` | admin/chairman | Events by SK program |
| `GET` | `/api/admin/budget` | admin/chairman | Budget by category |
| `GET` | `/api/users` | admin/chairman | List users |
| `POST` | `/api/users` | admin only | Create user |
| `PATCH` | `/api/users/:id` | admin only | Update user |
| `DELETE` | `/api/users/:id` | admin only | Delete/deactivate |

### Frontend (`App.jsx`)
`AdminDashboardModule` component:
- **Stats row**: Total Events, Total Attendees, Budget Used, Pending Suggestions
- **Charts**: Participation by SK Program (bar) + Budget by Category (donut)
- **Recent Activity**: last 10 log entries (compact list)
- **System Logs** (admin only): paginated table with actor/action/IP filters + CSV export
- **User Management**: admin = full CRUD table; chairman = read-only table
- Nav item: `{ id: 'admin', label: 'Admin Dashboard', emoji: '🛡️' }` — admin/chairman only

---

## Phase Schedule

### Phase 6-A — Auth Foundation & API Gate Parity
**Status:** **COMPLETED**  
**Target:** Backend auth infrastructure + login page UI + full environment/repo synchronization

**Scope:**
1. Install `bcryptjs` + `jsonwebtoken` in `backend/`
2. Add `users` + `token_blocklist` tables to SQLite (server.js)
3. Seed default users (hashed) on first startup — log initial passwords to console once
4. Implement `requireAuth()` middleware across all protected endpoints (Events CRUD, document export/generation, chat streams, analytics, conversations)
5. Add routes: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
6. Add `LoginPage` component to `App.jsx`
7. Add `useAuth` state, JWT storage in `sessionStorage`, token attachment on all API calls via `authHeaders` utility forwarding
8. Role-based sidebar nav guards and Protected Features Registry UI elements filtering (e.g., event deletions hidden from non-admins)
9. Synchronize auth gate logic across both `askyouth-web-only/src/App.jsx` and `frontend/src/App.jsx`
10. Logout button in sidebar footer
11. **Update `CONTEXT.md`** — log auth implementation and gate parity
12. **Update `SYSTEM_CONTEXT.md`** — update §4 to mark Login as implemented, update §6 with new auth routes and zero-trust parity details

**Definition of Done:** App shows login screen on fresh load. All 4 role credentials work. Expired/missing token redirects to login. No credentials in any client-side file. Full bearer header attachment coverage across all production and local twin frontend requests.

---

### Phase 6-B — SK Event Patterns + Events Enhancements
**Target:** Updated event categories + new DB fields + enhanced filters

**Scope:**
1. Add `fiscal_year` + `sk_program` migration to DB init block (server.js)
2. Update `GET/POST/PATCH /api/events` to handle new fields + filter params
3. Update `EVENT_CATEGORIES`, add `SK_PROGRAMS` constant (App.jsx)
4. Update `EMPTY_EVENT_FORM` + `EventFormModal` for new fields
5. Add `filterYear` + `filterSkProgram` states + toolbar filters (EventsAnalyticsModule)
6. Add `sk_program` chip to event cards
7. **Update `CONTEXT.md`** — log SK pattern implementation
8. **Update `SYSTEM_CONTEXT.md`** — update §5 data/persistence section with new columns

**Definition of Done:** New events can be assigned fiscal year and SK program cluster. Existing events still load. Filters work for all new fields.

---

### Phase 6-C — Yearly Events View
**Target:** Heatmap + timeline view for SK annual planning

**Scope:**
1. Add `type=yearly` + `year` query param to `/api/analytics/events` handler (server.js)
2. Query groups events by month + sk_program, returns Plotly heatmap JSON + timeline array
3. Add `'yearly'` chart tab to `EventsAnalyticsModule` (App.jsx)
4. Add fiscal year `<select>` to yearly view controls
5. Render Plotly heatmap + chronological timeline list below
6. **Update `CONTEXT.md`** — log yearly view implementation
7. **Update `SYSTEM_CONTEXT.md`** — update §4 features section

**Definition of Done:** "Yearly Overview" tab shows heatmap. Changing year selector reloads data. Timeline list appears below chart grouped by month.

---

### Phase 6-D — Suggestions Module
**Target:** Full suggestion lifecycle (submit → review → resolve)

**Scope:**
1. Add `suggestions` table to SQLite (server.js)
2. Add `POST /api/suggestions`, `GET /api/suggestions`, `PATCH /api/suggestions/:id` routes (protected with `requireAuth`)
3. Add `SuggestionsModule` component to `App.jsx`
4. Add nav item for suggestions (all roles)
5. Youth view: submit form + own suggestions list
6. Officer/Admin view: full review table + status/response management
7. **Update `CONTEXT.md`** — log suggestions implementation
8. **Update `SYSTEM_CONTEXT.md`** — update actors table (Youth/SK actor descriptions), §4 features section, §6 HTTP surface

**Definition of Done:** Youth can submit a suggestion. Officers/Admins can see all suggestions, change status, add response. Status badges update correctly.

---

### Phase 6-E — Admin Dashboard + System Logs + User Management
**Target:** Full admin visibility + user CRUD

**Scope:**
1. Add `system_logs` table + `writeLog()` helper (server.js)
2. Wire `writeLog()` calls into: login, logout, event CRUD, suggestion status change, user CRUD
3. Add routes: `GET /api/admin/stats`, `GET /api/admin/logs`, `GET /api/admin/participation`, `GET /api/admin/budget` (admin/chairman)
4. Add User Management routes: `GET/POST/PATCH/DELETE /api/users` (admin only for write ops)
5. Add `AdminDashboardModule` to `App.jsx` — stats, charts, activity feed, logs viewer, user management
6. Role-guard: admin sees logs + user CRUD; chairman sees everything except logs viewer and user write ops
7. Add `{ id: 'admin', ... }` to sidebar nav (admin/chairman only)
8. **Update `CONTEXT.md`** — log admin dashboard implementation
9. **Update `SYSTEM_CONTEXT.md`** — update §3 actors table (admin role description), §4 features (admin reports marked as implemented), §6 HTTP surface with new admin routes

**Definition of Done:** Admin sees stats, charts, log table, and user management. Chairman sees stats and charts and read-only users. Youth/Officer cannot reach admin routes (403). Logs appear for all write actions.

---

### Phase 6-F — Mobile View (Responsive/Adaptive)
**Target:** Full mobile usability on 375px+ screens

**Scope:**
1. Sidebar → fixed overlay on mobile with backdrop (App.jsx)
2. Add mobile bottom nav bar (`md:hidden`) with role-filtered icons (App.jsx)
3. Add `pb-20 md:pb-0` to chat content area
4. Convert event card grid to `grid-cols-1 md:grid-cols-auto` on mobile
5. Admin dashboard stat cards: `grid-cols-2 sm:grid-cols-4`
6. All modals: `w-full mx-4` max-w on mobile
7. All touch targets: `min-h-[44px]`
8. Test + fix any horizontal overflow on 375px width
9. **Update `CONTEXT.md`** — log mobile responsiveness implementation
10. **Update `SYSTEM_CONTEXT.md`** — update §2 topology ("Browser: desktop or mobile" note) and §4 Mobile view marked as implemented

**Definition of Done:** App opens on a 375px viewport with no horizontal scroll. Sidebar slides as overlay. Bottom nav is visible and switches modules. All buttons are tappable without zoom.

---

## Context File Update Protocol (Every Phase)

At the end of **every phase**, before marking it done:

### `CONTEXT.md` — append to Change Log
```
### 2026-05 — Phase 6-X — [Phase name]
- [One sentence per change made. Additive description only.]
```
Do **not** remove any existing change log entries.

### `SYSTEM_CONTEXT.md` — update affected sections only
- Update the relevant section (§4 features, §6 HTTP surface, etc.) to reflect implemented status
- Do **not** delete existing content — add to or correct existing text only
- Update the version note at the bottom with the date of update

---

## Validation Checklist

### Phase 6-A — Auth

- [x] `POST /api/auth/login` with correct credentials returns `{ token, user }` — HTTP 200
- [x] `POST /api/auth/login` with wrong password returns HTTP 401 with no token
- [x] JWT is stored in `sessionStorage` — verify with browser DevTools → Application → sessionStorage
- [x] No password, JWT_SECRET, or credential appears in any file under `askyouth-web-only/`
- [x] On fresh page load with no token, `LoginPage` renders instead of main app
- [x] On fresh page load with a valid token, main app renders without showing login
- [x] On fresh page load with an expired/invalid token, `LoginPage` renders
- [x] `GET /api/auth/me` with valid token returns `{ id, username, role, full_name }` — HTTP 200
- [x] `GET /api/auth/me` with no token returns HTTP 401
- [x] `POST /api/auth/logout` adds JTI to blocklist; subsequent `GET /api/auth/me` with that token returns 401
- [x] Youth role sees only: Chat, Suggestions in sidebar
- [x] Officer role sees: Chat, Events, Suggestions in sidebar
- [x] Chairman role sees: Chat, Events, Suggestions, Admin Dashboard in sidebar
- [x] Admin role sees: Chat, Events, Suggestions, Admin Dashboard, Reports in sidebar
- [x] Logout button clears `sessionStorage` and redirects to `LoginPage`
- [x] `full_name` and role badge are visible in the top header after login
- [x] Navigating directly to the Events/Admin view in URL without a valid token redirects to login (frontend guard)
- [x] `CONTEXT.md` has a new dated entry for Phase 6-A
- [x] `SYSTEM_CONTEXT.md` §4 marks "Login page" as implemented; §6 lists new auth routes

### Phase 6-B — SK Event Patterns

- [ ] `events` table has `fiscal_year` and `sk_program` columns after server restart (verify with SQLite browser or `db.pragma('table_info(events)')`)
- [ ] `POST /api/events` accepts `fiscal_year` (integer) and `sk_program` (text) — event is saved with those values
- [ ] `GET /api/events?fiscal_year=2025` returns only events where `fiscal_year = 2025`
- [ ] `GET /api/events?sk_program=kabataan-atleta` returns only matching events
- [ ] Event form in UI shows "Event Type" dropdown with 10 SK categories (not old generic list)
- [ ] Event form shows "SK Program Cluster" dropdown with 8 SK program labels
- [ ] Event form shows "Fiscal Year" numeric input (defaults to current year)
- [ ] Existing seeded events still display correctly (no null-pointer errors for missing new fields)
- [ ] SK Program chip appears on event cards in Manage Events list
- [ ] `CONTEXT.md` updated; `SYSTEM_CONTEXT.md` §5 updated with new columns

### Phase 6-C — Yearly Events

- [ ] `GET /api/analytics/events?type=yearly&year=2025` returns valid Plotly heatmap JSON + `timeline` array
- [ ] "Yearly Overview" tab is visible in the Analytics section of EventsAnalyticsModule
- [ ] Selecting "Yearly Overview" tab renders the Plotly heatmap without errors
- [ ] Heatmap axes: X = months (Jan–Dec), Y = SK program clusters; cells show event count
- [ ] Timeline list below heatmap shows events for selected year grouped by month header
- [ ] Changing the fiscal year selector updates both heatmap and timeline
- [ ] If no events exist for a year, a "No events for this year" empty state is shown
- [ ] Existing chart tabs (By Event, By Month, etc.) still work unchanged
- [ ] `CONTEXT.md` updated; `SYSTEM_CONTEXT.md` §4 marks Yearly Events as implemented

### Phase 6-D — Suggestions

- [ ] `suggestions` table exists in SQLite after server restart
- [ ] `POST /api/suggestions` with valid token returns HTTP 201 and suggestion ID
- [ ] `POST /api/suggestions` without token returns HTTP 401
- [ ] `GET /api/suggestions` with a Youth token returns only that user's own suggestions
- [ ] `GET /api/suggestions` with an Officer/Admin token returns all suggestions
- [ ] `PATCH /api/suggestions/:id` with Officer/Admin token updates `status` and `admin_response`
- [ ] `PATCH /api/suggestions/:id` with a Youth token returns HTTP 403
- [ ] Youth sees submit form + "My Suggestions" list in Suggestions view
- [ ] Suggestions view for Officer/Admin shows full table with all entries
- [ ] Status badge colors: pending = amber, reviewed = blue, resolved = green
- [ ] "Reply" modal saves `admin_response` text and status change — UI updates immediately after save
- [ ] Empty state shown when no suggestions exist yet
- [ ] `CONTEXT.md` updated; `SYSTEM_CONTEXT.md` §4 marks Suggestions as implemented; §6 lists new routes

### Phase 6-E — Admin Dashboard + Logs

- [x] `system_logs` table exists in SQLite after server restart
- [x] Successful login writes a `login_success` log entry with actor, role, IP
- [x] Failed login attempt writes a `login_fail` log entry
- [x] Event creation writes a `create_event` log entry with event title as target
- [x] Suggestion status change writes a `update_suggestion` log entry
- [x] `GET /api/admin/stats` with Admin token returns `{ total_events, total_attendees, total_budget, pending_suggestions, active_users }` — HTTP 200
- [x] `GET /api/admin/stats` with Officer token returns HTTP 403
- [x] `GET /api/admin/logs` with Admin token returns paginated log array
- [x] `GET /api/admin/logs` with Chairman token returns HTTP 403
- [x] `GET /api/admin/participation` returns events grouped by SK program (admin/chairman — HTTP 200)
- [x] `GET /api/admin/budget` returns budget grouped by category (admin/chairman — HTTP 200)
- [x] `POST /api/users` with Admin token creates a new user with hashed password — HTTP 201
- [x] `POST /api/users` with Chairman token returns HTTP 403
- [x] `DELETE /api/users/:id` with Admin token deactivates user — HTTP 200
- [x] `DELETE /api/users/:id` with Chairman token returns HTTP 403
- [x] Admin Dashboard renders stat cards with live data (not zeros or placeholders)
- [x] Participation bar chart renders without JS errors
- [x] Budget donut chart renders without JS errors
- [x] System Logs section visible to Admin, hidden to Chairman
- [x] System Logs table shows actor, role, action, IP for each entry
- [x] "Export Logs" button downloads a CSV file of currently visible log rows
- [x] User Management: Admin sees Edit/Delete buttons on user rows; Chairman sees table but no action buttons
- [x] `CONTEXT.md` updated; `SYSTEM_CONTEXT.md` §3 actors, §4 features, §6 routes updated

### Phase 6-F — Mobile View

- [ ] App opens on 375px viewport (Chrome DevTools mobile simulation) with zero horizontal scroll
- [ ] Sidebar on mobile opens as a full-height overlay (not shifting layout)
- [ ] Dark backdrop appears behind open sidebar on mobile; tapping it closes the sidebar
- [ ] Mobile bottom navigation bar is visible on ≤ 767px width
- [ ] Mobile bottom nav shows correct modules for current role (Youth: 2 items; Admin: 4 items)
- [ ] Tapping a module in bottom nav switches the active view
- [ ] Chat input is accessible and not obscured when sidebar is closed on mobile
- [ ] Chat send button and file attach button are at least 44×44px on mobile
- [ ] Event cards display in single-column layout on 375px
- [ ] Admin stat cards display in 2-column grid on 375px (not overflowing)
- [ ] EventFormModal opens full-width on mobile with `mx-4` padding
- [ ] SuggestionsModule renders correctly on 375px (no overflow)
- [ ] On tablet (768px): sidebar shows as column, bottom nav is hidden
- [ ] `CONTEXT.md` updated; `SYSTEM_CONTEXT.md` §2 topology + §4 Mobile view updated

---

## Zero-Regression Guarantee

These must pass after **every phase** (not just the last one):

**Core AI**
- [ ] Send a message → receive streamed response from Qwen 2.5 7B (no hang, no error)
- [ ] Upload a PDF/DOCX → RAG retrieval kicks in → `SourcesPanel` appears with source match %
- [ ] `ExportResponseButton` appears on every completed assistant message; clicking opens DOCX/PDF popup
- [ ] `<think>` blocks are stripped from visible message text
- [ ] `<official_document>` blocks show export panel with DOCX + PDF buttons

**Events system**
- [ ] `GET /api/events` (no params) returns all seeded events — HTTP 200, JSON array
- [ ] `POST /api/events` creates a new event — HTTP 200, returns `{ id }`
- [ ] `PATCH /api/events/:id` updates an existing event — HTTP 200
- [ ] `DELETE /api/events/:id` removes event — HTTP 200
- [ ] `POST /api/events/parse-document` with a PDF returns extracted fields — HTTP 200
- [ ] `GET /api/analytics/events?type=event` returns Plotly chart JSON — HTTP 200
- [ ] `GET /api/analytics/events?type=monthly` returns Plotly chart JSON — HTTP 200
- [ ] `GET /api/analytics/events?type=status` returns Plotly chart JSON — HTTP 200
- [ ] `GET /api/analytics/events?type=attendance` returns Plotly chart JSON — HTTP 200
- [ ] All 4 chart tabs render in `EventsAnalyticsModule` without JS errors
- [ ] `EventFormModal` opens for create and edit; saves correctly

**Document generation**
- [ ] `POST /api/export/document` with `format=docx` returns a downloadable DOCX blob
- [ ] `POST /api/export/document` with `format=pdf` returns a downloadable PDF blob
- [ ] `POST /api/generate-document` with `template_id=resolution` returns a DOCX/PDF
- [ ] `ReportsModule` — all 3 template types (Resolution, Minutes, Certificate) generate without error

**Infrastructure**
- [ ] `GET /health` returns `{ status: 'ok' }` — HTTP 200 with permissive CORS (no auth needed)
- [ ] HNSW vector index and `hnsw-meta.json` survive server restart (embeddings not re-computed)
- [ ] `chunk_embeddings` SQLite table exists and is not empty after first upload
- [ ] All existing `events` table columns present after migration (no columns dropped)
- [ ] Vercel deploy from `askyouth-web-only/` still works (build passes, `VITE_BACKEND_URL` resolves)

**Frontend persistence**
- [ ] Thread list survives page reload (localStorage)
- [ ] `retrievedChunks` on past messages survive page reload (localStorage)
- [ ] Pinned/renamed threads survive page reload
- [ ] `ChatbotInactivePage` renders when backend is down (kill `server.js`, reload app)
- [ ] Backend health polling resumes after backend comes back up (auto-retry visible in UI)
