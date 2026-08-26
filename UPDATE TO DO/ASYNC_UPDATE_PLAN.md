# aSK//YOUTH.AI — ASYNC UPDATE PLAN
**Created:** 2026-05-14  
**Phase Basis:** Professor-Mandatory Feature Set (adviser review requirements)  
**Backup Status:** Confirmed before this plan was written  
**Architecture Rule:** Every phase is **additive only**. No existing route, DB column, state variable, or component is removed or renamed unless the change is strictly required to wire the new feature.

---

## ⚠️ PROTECTED FEATURES — NEVER REMOVE OR BREAK

> [!CAUTION]
> The items below are **permanently protected**. They must exist and function correctly after every single phase update. If a phase touches a file that contains any of these features, the implementer MUST verify the feature still works before marking the phase done. **Removal or silent breakage of any item below is a critical failure.**

### Backend (`backend/server.js`) — Protected Routes & Systems

| Route / System | Description | Rule |
|----------------|-------------|------|
| `POST /api/chat/stream` | SSE streaming chat with Qwen 2.5 7B — the core AI feature | Never touch internals; only add middleware before |
| `GET /api/events` | List events with filter support (`status`, `category`) | Only add new optional query params; never remove existing ones |
| `POST /api/events` | Create new event | Only extend allowed field list; never change existing field handling |
| `PATCH /api/events/:id` | Update existing event | Same as above |
| `DELETE /api/events/:id` | Delete event | Untouched |
| `POST /api/events/parse-document` | AI-powered event field extraction from uploaded document (PDF, DOCX, image) via Python + Qwen fallback | Never touch |
| `GET /api/analytics/events` | Events analytics — types: `event`, `monthly`, `status`, `attendance` | Only add new `type` cases; never remove existing ones |
| `POST /api/export/document` | Export AI reply or official document as DOCX or PDF with SK letterhead | Only extend (e.g. `isPlainReply` flag already exists); never modify letterhead logic |
| `POST /api/generate-document` | Generate SK official document from template (Resolution, Minutes, Certificate) via Python AI layer | Never touch |
| `GET /health` | Health check with permissive CORS — used by frontend to detect backend status | Never touch |
| `GET /ready` | Model readiness check | Never touch |
| HNSW vector store (`HNSWVectorStore` class) | Persistent HNSW index + brute-force fallback for RAG retrieval | Never touch class internals |
| SQLite `events` table | All existing columns: `id, title, description, category, date, time, location, organizer, status, requirements, contact, attendees, male_count, female_count, staff_count, budget_allotted` | Never drop or rename; only ADD columns via migration |
| SQLite `chunk_embeddings` table | Embedding dedup cache | Never touch |
| `embedBatch()` / `embed()` / `cosineSim()` | RAG embedding pipeline (Python primary + Xenova fallback) | Never touch |
| `acquireGenLock()` / `releaseGenLock()` | Generation lock preventing concurrent LLM inference | Never touch |
| `loadSystemPrompt()` / `loadRewriterPrompt()` | System prompt loader from `response_styles/response_style.prompt.md` | Never touch |
| `stripMarkdown()` | Markdown stripper for plain-reply exports (Phase 5) | Never remove; only extend if needed |
| Multer upload config | File upload validation (MIME types, extensions, size limit, max files) | Never relax security constraints |
| Rate limiter (`apiLimiter`) | 60 req/min per IP on `/api` | Never remove; only tune if required |
| Trust proxy config | Required for Cloudflare Tunnel + express-rate-limit compatibility | Never remove |
| CORS config | `CORS_ORIGINS` env-driven allowlist | Never widen to `*`; only add origins via env |

### Frontend (`askyouth-web-only/src/App.jsx`) — Protected Components & State

| Component / Feature | Description | Rule |
|--------------------|-------------|------|
| `ExportResponseButton` | Export icon on every completed assistant message → DOCX/PDF popup (Phase 5) | Never remove; update only if export feature itself is updated |
| `SourcesPanel` / `retrievedChunks` per message | RAG source match display below AI messages (Phase 5) | Never remove; update only if RAG output format changes |
| `EventsAnalyticsModule` | Full events analytics + manage events module — chart tabs, stats cards, event CRUD cards | Never remove; only add to (new tabs, new filters) |
| `EventFormModal` | Event create/edit form with document import | Never remove; only add fields |
| `ReportsModule` | SK official document generator (Resolution, Minutes, Certificate → DOCX/PDF) | Never remove; never modify template logic |
| Chat + SSE streaming | `sendMessage()`, SSE reader loop, `streamPhase` state, streaming content display | Never touch streaming logic; only add to message rendering |
| Thread management | `threads` state, `localStorage` persistence, create/rename/pin/delete thread | Never touch; only extend if new thread metadata is needed |
| File upload / drag-drop / clipboard paste | Multi-file attach (up to 5), drag-drop zone, Ctrl+V paste of images | Never touch |
| `ChatbotInactivePage` | Shown when backend is down; includes retry button and health URL display | Never remove |
| Backend health polling | 30s interval `fetchBackendHealth()` → `backendStatus` state → conditional render | Never remove |
| Live clock in header | `formatClock()` ticking every second in top header | Never remove |
| Sidebar thread list | Sorted threads, three-dot menu (pin/rename/delete), active thread highlight | Never touch |
| Sidebar module nav | Bottom nav in sidebar with module switcher (`currentView` state) | Only add items; never remove existing ones |
| `handleExport()` | Export handler for official document blocks (reused by `ExportResponseButton`) | Never remove or rename |
| `<think>` tag extraction | Strips `<think>...</think>` from assistant messages before display | Never touch |
| `<official_document>` tag extraction | Fault-tolerant regex extracts doc title + content for export panel | Never touch |

### Build & Infrastructure — Protected

| Item | Rule |
|------|------|
| `askyouth-web-only/` as Vercel deploy source | Never change deploy path; `frontend/` stays local-dev-only |
| `VITE_BACKEND_URL` env var | Never hardcode URL in source; always use env |
| `start_system.bat` / `scripts/run_cloudflare_tunnel.bat` | Never modify without testing tunnel still works |
| `response_styles/response_style.prompt.md` | System prompt definition — never edit without explicit user instruction |
| SQLite `events.db` data | Seed data must survive all DB migrations |

---

## Roles Definition

| Role | Code | Access Level |
|------|------|-------------|
| **System Administrator** | `admin` | Full access: all views, CRUD users, see system logs, all reports |
| **SK Chairperson** | `chairman` | Same as admin EXCEPT cannot create/edit/delete users — read-only on user list |
| **SK Officer** | `officer` | Events management (CRUD), suggestions review, chat, events analytics |
| **Youth Member** | `youth` | Chat, submit suggestions, view events (read-only) |

---

## Security Constraints (Non-Negotiable)

1. **No credentials in frontend code.** Zero hardcoded passwords, tokens, or secrets in `App.jsx` or any client file.
2. **Passwords hashed on backend** using `bcryptjs` (cost factor ≥ 12) before storage in SQLite.
3. **Sessions managed via JWT** signed with `JWT_SECRET` from `backend/.env` (never exposed to client).
4. **Auth middleware** protects all sensitive routes — frontend only sends `Authorization: Bearer <token>` header.
5. **Logs** stored server-side in SQLite, never sent to frontend as raw SQL or full dump — admin sees paginated, filtered view through a dedicated API route.

---

## Feature Inventory

### Feature 1 — Login Page + Authentication System

**What it does:**  
Replaces the current anonymous access with a proper gated login screen. The frontend shows a login form; credentials are sent to the backend where they are verified against bcrypt-hashed passwords stored in a `users` SQLite table. On success, the backend issues a signed JWT. The frontend stores the JWT in `sessionStorage` (not `localStorage`, not a cookie) and attaches it as a `Bearer` token on all subsequent API requests. The login page renders before the main app if no valid token is found.

**Roles and their default seed accounts:**  
Seed accounts are inserted into the `users` table once on first startup (if the table is empty). Their passwords are hashed server-side with `bcryptjs`. No default credentials are placed anywhere in the frontend or version-controlled files — they are generated at init time and printed to the console once, or set via environment variables.

**Backend changes (`server.js`):**

New NPM dependencies required (additive to `package.json`):
- `bcryptjs` — password hashing
- `jsonwebtoken` — JWT sign/verify

New SQLite table (additive):
```sql
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  username    TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role        TEXT NOT NULL CHECK(role IN ('admin','chairman','officer','youth')),
  full_name   TEXT NOT NULL,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

New routes (additive):
- `POST /api/auth/login` — accepts `{ username, password }`, returns `{ token, user: { id, username, role, full_name } }`
- `POST /api/auth/logout` — invalidates token server-side (JWT blocklist in SQLite `token_blocklist` table)
- `GET /api/auth/me` — verifies current token, returns user info
- `GET /api/users` — list users (admin/chairman, protected; chairman gets read-only)
- `POST /api/users` — create user (admin only)
- `PATCH /api/users/:id` — update user (admin only)
- `DELETE /api/users/:id` — deactivate user / delete (admin only)

Auth middleware:
```js
function requireAuth(roles = []) {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    // verify JWT, check blocklist, check role
    // attach req.user = { id, username, role, full_name }
    next();
  };
}
```

**Frontend changes (`App.jsx`):**

- Add `LoginPage` component — dark glassmorphic full-screen form with username/password inputs. No credentials stored. On submit, POST to `/api/auth/login`, store returned JWT in `sessionStorage('askyouth_token')`, store `{ role, name }` in component state.
- Add `useAuth` state in `App()` — reads JWT from `sessionStorage` on mount, calls `/api/auth/me` to verify it's still valid. If invalid/expired → show `LoginPage`.
- All API calls from frontend attach `Authorization: Bearer <token>` header.
- Role-based view guards: sidebar nav items rendered conditionally based on `session.role`.
- Logout button clears `sessionStorage`, calls `POST /api/auth/logout`, resets state.
- Display `full_name` + role badge in header.

---

### Feature 2 — SK-Patterned Events

**What it does:**  
Updates the events module to align with the official SK program lifecycle and naming conventions per DILG/DepEd SK guidelines. Currently, event categories are generic strings. This feature updates categories to match the 8 official SK program clusters and adds two new DB fields: `fiscal_year` (integer, the SK fiscal year this event belongs to) and `sk_program` (text, the SK program cluster ID).

**Backend changes (`server.js` — additive migration only):**

```js
// New migration columns added to existing migration array:
{ name: 'fiscal_year', sql: 'ALTER TABLE events ADD COLUMN fiscal_year INTEGER' },
{ name: 'sk_program',  sql: 'ALTER TABLE events ADD COLUMN sk_program TEXT DEFAULT \'general\'' },
```

Update `GET /api/events` to accept `fiscal_year` and `sk_program` query params (additive filter conditions).  
Update `POST /api/events` and `PATCH /api/events/:id` allowed field lists to include `fiscal_year` and `sk_program`.

**Frontend changes (`App.jsx`):**

Update `EVENT_CATEGORIES` constant to SK-aligned values:
```
education-training, health-wellness, sports-recreation, livelihood-economic,
environmental, values-formation, peace-order, assembly, scholarship, community-service
```

Add `SK_PROGRAMS` constant mapping IDs to official SK program cluster names (Kabataan Para sa Bayan, Kabataang Atleta, etc.).

Update `EMPTY_EVENT_FORM` to include `fiscal_year` (default: current year) and `sk_program` (default: `'general'`).

Update `EventFormModal` to render:
- `Event Type` dropdown (renamed from "Category") using updated `EVENT_CATEGORIES`
- `SK Program Cluster` dropdown using `SK_PROGRAMS`
- `Fiscal Year` number input

Update event cards in Manage Events to show `sk_program` chip badge.

---

### Feature 3 — Events Enhancements

**What it does:**  
Minor improvements to the existing Events module: adds a fiscal year filter and "This Week" quick-filter to the Manage Events toolbar, shows the SK program cluster as a chip on event cards, and ensures the `GET /api/events` route supports the new filter params.

**Backend changes (`server.js`):**  
Additive only — extend existing query builder in `GET /api/events` to accept `fiscal_year` and `sk_program` as filter params.

**Frontend changes (`App.jsx`):**

- Add `filterYear` state in `EventsAnalyticsModule` (default `''`)
- Add fiscal year `<select>` in manage toolbar (current year ± 2 range)
- Add `filterSkProgram` state + `<select>` in toolbar
- Append new filter params to `fetchEvents()` URL when set
- Add `sk_program` chip badge to each event card row

---

### Feature 4 — Yearly Events View

**What it does:**  
A new "Yearly Overview" chart tab inside `EventsAnalyticsModule` that plots all SK events across a fiscal year. Shows a Plotly heatmap (rows = SK program clusters, columns = months Jan–Dec, cell value = event count) plus a chronological timeline list of all events in the selected year grouped by month. A fiscal year selector dropdown controls which year is displayed.

**Backend changes (`server.js`):**  
Add `case 'yearly':` inside the existing `/api/analytics/events` switch/if block. The yearly case:
1. Accepts `year` query param (default: current year)
2. Queries `events` table grouped by `sk_program` and `strftime('%m', date)`
3. Returns a Plotly heatmap JSON structure: `{ data: [{ type: 'heatmap', x: months, y: programs, z: counts }], layout: { title: 'Yearly SK Events Heatmap' } }`
4. Also returns a `timeline` array of event rows sorted by date for the list view below the chart

**Frontend changes (`App.jsx`):**

Add `'yearly'` to `chartTabs` array: `{ id: 'yearly', label: '📅 Yearly Overview' }`.

When `chartType === 'yearly'`:
- Show fiscal year `<select>` (current year default, ± 2 range)
- Render Plotly heatmap chart
- Below chart: render timeline list (month group headers → event cards sorted by date)

---

### Feature 5 — Mobile View (Responsive/Adaptive)

**What it does:**  
Makes the entire app adaptive to any device screen size — phones (375px+), tablets (768px+), and desktops (1024px+). The layout uses a mobile-first approach: on small screens the sidebar becomes a full-height overlay (not a layout column), a fixed bottom navigation bar replaces the sidebar module switcher, content areas reflow to single-column, and all interactive targets meet the 44×44px minimum touch size requirement. The app should be fully usable on a real mobile browser without horizontal scrolling.

**Frontend changes (`App.jsx` + `index.css`):**

Sidebar behavior:
- On `md:` (≥768px): sidebar is a fixed-width column (current behavior, unchanged)
- On `< md`: sidebar is `position: fixed`, `z-50`, `h-full`, slides in from left as overlay. Add a translucent dark backdrop behind it that dismisses the sidebar on tap.

Mobile bottom navigation bar (new, `md:hidden`):
```jsx
<nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur border-t border-slate-700 flex justify-around py-2 safe-area-inset-bottom">
  {/* icon + label for each module — role-filtered */}
</nav>
```

Content area adjustments:
- Chat area gets `pb-20 md:pb-0` padding so bottom nav doesn't overlap input
- Event cards grid changes to single column on mobile
- Admin dashboard stat cards grid: `grid-cols-2 sm:grid-cols-4`
- Modal widths: `w-full mx-4` on mobile

Touch targets:
- All nav buttons, action buttons, card actions: `min-h-[44px]`
- Input fields: `min-h-[44px]`

---

### Feature 6 — Suggestions Module

**What it does:**  
A structured feedback channel where Youth members can submit written suggestions (with a category label and optional submitter name), and SK Officers, SK Chairperson, and Admins can view, respond to, and update the status of each suggestion. The module is accessible to all roles but renders differently based on role: Youth see a submission form and their own past suggestions; Officers and above see the full list with management controls.

**Backend changes (`server.js`):**

New SQLite table (additive):
```sql
CREATE TABLE IF NOT EXISTS suggestions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  content         TEXT NOT NULL,
  category        TEXT DEFAULT 'general',
  submitter_name  TEXT DEFAULT 'Anonymous',
  submitter_role  TEXT DEFAULT 'youth',
  status          TEXT DEFAULT 'pending' CHECK(status IN ('pending','reviewed','resolved')),
  admin_response  TEXT,
  responded_by    TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

New routes (additive):
- `POST /api/suggestions` — submit suggestion (requires auth, any role)
- `GET /api/suggestions` — list suggestions (officers/chairman/admin see all; youth see own only, filtered by `submitter_id`)
- `PATCH /api/suggestions/:id` — update status + `admin_response` (officer/chairman/admin only)

**Frontend changes (`App.jsx`):**

Add `SuggestionsModule` component with two views:

**Submit view** (Youth role — shown first by default):
- `content` textarea (required)
- `category` select: `general`, `events`, `programs`, `facilities`, `governance`, `other`
- `submitter_name` text input (optional, defaults to `full_name` from session)
- Submit button → `POST /api/suggestions` with Bearer token
- Success toast → clear form
- Below form: "My Suggestions" list showing own submissions with status badge

**Review view** (Officer/Chairperson/Admin role):
- Table/card list of all suggestions sorted by `created_at DESC`
- Columns: submitter name, category, content preview, status badge, date, actions
- "Reply" button → inline expand or small modal with `admin_response` textarea + status select + Save
- Status badges: `pending` = amber, `reviewed` = blue, `resolved` = green

Add `{ id: 'suggestions', label: 'Suggestions', emoji: '💬' }` to sidebar nav (visible to all roles).

---

### Feature 7 — Admin Dashboard + Reports

**What it does:**  
A protected dashboard visible only to `admin` and `chairman` roles. Unlike the existing `ReportsModule` (which generates DOCX/PDF documents from templates — that module is **unchanged**), the Admin Dashboard provides live analytics: summary stat cards, participation charts, budget utilization charts, a recent activity feed, and a system log viewer. Admins also get access to user management (CRUD) while Chairpersons get read-only user list access.

**Backend changes (`server.js`):**

New SQLite table for system logs (additive):
```sql
CREATE TABLE IF NOT EXISTS system_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  actor       TEXT NOT NULL,
  role        TEXT NOT NULL,
  action      TEXT NOT NULL,
  target      TEXT,
  details     TEXT,
  ip_address  TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

Log writer helper (additive):
```js
function writeLog(actor, role, action, target, details, ip) {
  db.prepare('INSERT INTO system_logs (actor, role, action, target, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
    .run(actor, role, action, target || null, details || null, ip || null);
}
```

Call `writeLog()` inside: login success/fail, logout, user create/update/delete, suggestion status change, event create/update/delete.

New routes (additive):
- `GET /api/admin/stats` — aggregated counts: total events, attendees, budget, suggestions pending, active users (admin/chairman only)
- `GET /api/admin/logs` — paginated system log entries with `?page=1&limit=50&actor=&action=` filters (admin only)
- `GET /api/admin/participation` — returns events participation data grouped by SK program (reuses events query)
- `GET /api/admin/budget` — returns budget allotment data grouped by category

**Frontend changes (`App.jsx`):**

Add `AdminDashboardModule` component:

**Stats row** (4 cards): Total Events, Total Attendees, Budget Used, Pending Suggestions.

**Charts section** (2 side-by-side):
- Participation by SK Program (Plotly bar chart, from `/api/admin/participation`)
- Budget by Category (Plotly donut chart, from `/api/admin/budget`)

**Recent Activity Feed**: last 10 system log entries (actor, action, timestamp) — compact list.

**System Logs section** (admin only, not visible to chairman):
- Paginated table: timestamp, actor, role, action, target, IP
- Filter inputs: actor name, action type, date range
- "Export Logs" button → downloads logs as CSV (client-side from fetched data)

**User Management section** (admin only):
- Table of all users: name, username, role, status, created date
- Admin: Edit (role change, deactivate/reactivate) + Delete buttons
- Chairman: table visible, no action buttons

Add `{ id: 'admin', label: 'Admin Dashboard', emoji: '🛡️', roles: ['admin','chairman'] }` to sidebar nav (role-guarded).

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
**Status:** **COMPLETED**  
**Target:** Full mobile usability on 375px+ screens

**Scope:**
1. Sidebar → fixed overlay on mobile with backdrop (App.jsx)
2. Removed mobile bottom nav bar per user request (App.jsx)
3. Consolidated navigation: All redundant toggle buttons removed; single global fixed hamburger button implemented.
4. Convert event card grid to `grid-cols-1 md:grid-cols-auto` on mobile
5. Admin dashboard stat cards: `grid-cols-2 sm:grid-cols-4`
6. All modals: `w-full mx-4` max-w on mobile
7. All touch targets: `min-h-[44px]`
8. AI Assistant placeholder cleaned up ("Initiate prompt...")
9. **Update `CONTEXT.md`** — log mobile responsiveness and navigation consolidation
10. **Update `SYSTEM_CONTEXT.md`** — update §2 topology and §4 Mobile view status

**Definition of Done:** App opens on a 375px viewport with no horizontal scroll. Sidebar slides as overlay. Single global hamburger button toggles menu from same spot on all views. No redundant buttons. Chat input is minimalist.

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

- [x] App opens on 375px viewport (Chrome DevTools mobile simulation) with zero horizontal scroll
- [x] Sidebar on mobile opens as a full-height overlay (not shifting layout)
- [x] Dark backdrop appears behind open sidebar on mobile; tapping it closes the sidebar
- [x] Mobile bottom navigation bar is INTENTIONALLY REMOVED per user request
- [x] Sidebar navigation is accessible via hamburger menu on all views
- [x] Tapping a module in sidebar switches the active view
- [x] Chat input is accessible and not obscured when sidebar is closed on mobile
- [x] Chat send button and file attach button are at least 44×44px on mobile
- [x] Event cards display in single-column layout on 375px
- [x] Admin stat cards display in 2-column grid on 375px (not overflowing)
- [x] EventFormModal opens full-width on mobile with `mx-4` padding
- [x] SuggestionsModule renders correctly on 375px (no overflow)
- [x] On tablet (768px): sidebar shows as column, bottom nav is hidden
- [x] `CONTEXT.md` updated; `SYSTEM_CONTEXT.md` §2 topology + §4 Mobile view updated

---

## Zero-Regression Guarantee

These must pass after **every phase** (not just the last one):

**Core AI**
- [x] Send a message → receive streamed response from Qwen 2.5 7B (no hang, no error)
- [x] Upload a PDF/DOCX → RAG retrieval kicks in → `SourcesPanel` appears with source match %
- [x] `ExportResponseButton` appears on every completed assistant message; clicking opens DOCX/PDF popup
- [x] `<think>` blocks are stripped from visible message text
- [x] `<official_document>` blocks show export panel with DOCX + PDF buttons

**Events system**
- [x] `GET /api/events` (no params) returns all seeded events — HTTP 200, JSON array
- [x] `POST /api/events` creates a new event — HTTP 200, returns `{ id }`
- [x] `PATCH /api/events/:id` updates an existing event — HTTP 200
- [x] `DELETE /api/events/:id` removes event — HTTP 200
- [x] `POST /api/events/parse-document` with a PDF returns extracted fields — HTTP 200
- [x] `GET /api/analytics/events?type=event` returns Plotly chart JSON — HTTP 200
- [x] `GET /api/analytics/events?type=monthly` returns Plotly chart JSON — HTTP 200
- [x] `GET /api/analytics/events?type=status` returns Plotly chart JSON — HTTP 200
- [x] `GET /api/analytics/events?type=attendance` returns Plotly chart JSON — HTTP 200
- [x] All 4 chart tabs render in `EventsAnalyticsModule` without JS errors
- [x] `EventFormModal` opens for create and edit; saves correctly

**Document generation**
- [x] `POST /api/export/document` with `format=docx` returns a downloadable DOCX blob
- [x] `POST /api/export/document` with `format=pdf` returns a downloadable PDF blob
- [x] `POST /api/generate-document` with `template_id=resolution` returns a DOCX/PDF
- [x] `ReportsModule` — all 3 template types (Resolution, Minutes, Certificate) generate without error

**Infrastructure**
- [x] `GET /health` returns `{ status: 'ok' }` — HTTP 200 with permissive CORS (no auth needed)
- [x] HNSW vector index and `hnsw-meta.json` survive server restart (embeddings not re-computed)
- [x] `chunk_embeddings` SQLite table exists and is not empty after first upload
- [x] All existing `events` table columns present after migration (no columns dropped)
- [x] Vercel deploy from `askyouth-web-only/` still works (build passes, `VITE_BACKEND_URL` resolves)

**Frontend persistence**
- [x] Thread list survives page reload (localStorage)
- [x] `retrievedChunks` on past messages survive page reload (localStorage)
- [x] Pinned/renamed threads survive page reload
- [x] `ChatbotInactivePage` renders when backend is down (kill `server.js`, reload app)
- [x] Backend health polling resumes after backend comes back up (auto-retry visible in UI)

---

*Plan version: Phase 6 (A–F) | aSK//YOUTH.AI | Barangay Concepcion Dos, Marikina City*
