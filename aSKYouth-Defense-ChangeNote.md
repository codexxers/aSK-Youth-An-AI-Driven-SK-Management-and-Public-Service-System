# aSK//YOUTH.AI — Defense Revisions Change Note
**Version:** Defense Pack (Stages 0–4)
**Date:** 2026-11-26
**Commits:** `ba1a66b` (Stage 1) → `6eb2b35` (Stage 2) → Stage 3–4 (this commit)

> [!IMPORTANT]
> This document is the official change record for the Defense Revisions feature pack. Do **not** edit `aSKYouth-Maintenance-Guide.md` — this file serves as the addendum.

---

## Summary of Changes

### Stage 0 — Audit
Full audit report at `brain/.../stage0-audit.md`. No code changed.

---

### Stage 1 — Database & Backend (`ba1a66b`)

#### `backend/authz.js` — Rewritten
- Added: `isSecretary(user)`, `canReadBudget(user)`, `canWriteBudget(user)`
- Added: `getViewerCaps(user, event)` → returns `Set<'public'|'control'|'finance'>`
- Added: `serializeEvent(event, caps)` — the **only** way event data leaves the server
- Updated: `isElevated()` → now includes `secretary`
- Updated: `canMutateEvent()` → secretary is **read-only** on events (D4); admin also read-only
- Updated: `eventScopeSql()` → secretary sees all events (like chairman)
- Updated: `validateUserCommittee()` → secretary must have NULL committee

#### `backend/server.js` — 356 lines changed
- `users` CHECK constraint: added `'secretary'`
- Boot migration: rebuilds `users` table when `'secretary'` is absent from CHECK
- `event_feedback` table created: id, event_id (FK cascade), parent_id (nullable), author_user_id (nullable), author_name, author_label, kind (`comment|suggestion`), content, status (`visible|hidden`), is_official, created_at, moderated_by, moderated_at; indexed on event_id
- Added `verifyFinance` middleware (chairman + secretary only)
- Added `verifyControl` middleware (committee + chairman + secretary)
- Routes now auth-gated: `/api/admin/logs`, `/api/admin/participation`, `/api/admin/budget`, `/api/analytics/events`, `/api/admin/stats`
- `GET /api/events` and `GET /api/events/:id`: use `serializeEvent(e, getViewerCaps(user, e))` — no raw rows
- `PATCH /api/events/:id`: `budget_allotted` only allowed when `canWriteBudget(user)` is true
- Added: `GET /api/public/events` — no auth, public tier only
- Added: `GET /api/public/events/:id` — no auth, public tier only
- Added: `GET /api/public/events/:id/feedback` — public read
- Added: `POST /api/public/events/:id/feedback` — JWT required
- Added: `DELETE /api/event-feedback/:id` — JWT + elevated or own-committee scoped
- `POST /api/users` and `PATCH /api/users/:id`: singleton uniqueness enforced for chairman and secretary (D12)
- ABYIP context injection: non-finance users get `abyip_2025_public_chunks.json` (budget-free)

#### `knowledge_base/abyip/abyip_2025_public_chunks.json` — Created
- 9 chunks (1 master overview + 8 programs), all budget figures removed
- Used for youth/committee/admin AI context (never shows budget)

---

### Stage 2 — Frontend (`6eb2b35`)

#### `frontend/src/index.css`
- Added CSS theme variables: `:root { --color-surface, --color-bg, --color-border, --color-text, --color-text-muted }` and `html.dark { ... }` overrides
- Added dark-mode overrides for `.prose-chat`

#### `frontend/src/App.jsx`
- **Theme initializer IIFE** at module level: reads `localStorage('agy-theme')`, falls back to `prefers-color-scheme`, adds/removes `html.dark` before first render (no flash)
- **`useTheme` state** (`isDark`, `toggleTheme`): persists to `localStorage`
- **Theme toggle button** in chat header (moon/sun icon, right of NotificationBell)
- **Dark mode classes** on: main shell, left sidebar, bottom nav, module buttons, chat header, inner chat pane
- **Secretary role** added to `getVisibleModules()`: Chat, Suggestions, Events, Reports, FAQ, Admin Dashboard
- **`ROLE_COLORS`**: added `secretary: 'bg-purple-500'`
- **`ROLE_LABELS`**: added `secretary: 'SK Secretary'`
- **Budget field in `EventFormModal`**: wrapped in `{(role === 'chairman' || role === 'secretary') && ...}` — hidden from committee users
- **Admin stats `totalBudget`**: only rendered when `stats.totalBudget !== undefined` (server strips it for non-finance)
- **`/publicevents` SPA route**: checked before auth guard — renders `<PublicEventsPage>` with no login
- **`EventFeedbackPanel` component**: fetches/posts to `/api/public/events/:id/feedback`; moderator hide button for elevated users; in-module expand toggle per event
- **Event log button**: now also shown for `secretary` role

#### `frontend/src/pages/PublicEventsPage.jsx` — Created
- Standalone SPA page at `askyouth.online/publicevents` (no login required)
- Fetches `GET /api/public/events`, shows public tier fields
- Filter bar (status, committee, search)
- Expandable per-event feedback panel (read + post, reads token from localStorage if user logged in before)
- Login CTA button

#### `vercel.json`
- Added `"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]` for SPA routing (covers `/publicevents` and all deep links)

---

### Stage 3 — AI/RAG Updates

#### `backend/response_style.md`
- ROLES line: added `secretary (L2.5)` between chairman and committee
- ROLE ACCESS: added L2.5 secretary entry (Official Reports, full budget read, document generation, event read-only)
- Tone line: "SK officer" → "SK official"
- Mode D example labels: "L2 officer" → "L2 committee" (×2)
- BACKGROUND_REFERENCE condition: "officer" → "committee, secretary, chairman, or system_admin"
- RBAC examples: "SK Officers" → "SK Officials" / "authorized SK officials"

#### `backend/data/faq_global_public_chunks.json`
- Lines 21, 27, 39, 75: "SK officer(s)" → "SK official(s)" / "authorized SK officials"
- Line 75: "Officer account" → "Secretary, or Committee account"

#### `backend/migrate_faq_visibility.cjs`
- Line 53: "Admin, Chairman, or Officer account" → "Admin, Chairman, Secretary, or Committee account"

---

### Stage 4 — Tests

#### `backend/authz.test.mjs` — Created
Run with: `node --test backend/authz.test.mjs`

Test coverage:
- `isAdmin`, `isChairman`, `isSecretary`, `isElevated` — role predicates
- `canReadBudget` / `canWriteBudget` — D2: chairman + secretary only; admin excluded
- `canMutateEvent` — D4: committee (own) + chairman; secretary and admin read-only
- `serializeEvent` — public, control, and finance tiers; budget never leaks to non-finance caps
- `getViewerCaps` — correct cap set for each role including null/guest

---

## Decision Record

| # | Decision | Value |
|---|---|---|
| D1 | Secretary role | `secretary` — also gets Official Reports |
| D2 | Budget access | chairman + secretary only; admin excluded |
| D3 | Budget write | chairman + secretary; committee UI hides it |
| D4 | Control tier | committee (own) + chairman; admin read-only |
| D5 | Public API | No login required |
| D6 | Public fields | id, title, description, committee, date, time, location, status, requirements |
| D7 | Feedback auth | Guest/user JWT to post; public to read |
| D8 | officer → committee | Migrated at boot; NULL committee = view-only with banner |
| D9 | Unmappable events | → `general`, flagged `needs_review = 1` |
| D10 | Past events public | Yes |
| D11 | Full ABYIP | chairman + secretary only |
| D12 | Singleton roles | At most 1 active chairman, 1 active secretary; enforced server-side |
| D13 | Theme default | Saved → system preference → light |

---

## Rollback Notes
- All DB migrations are additive and idempotent (boot-time, inside transactions).
- The old `officer` role remains valid in the DB CHECK for rollback safety; it is never offered in UI or new API responses.
- To roll back Stage 1 only: revert `backend/server.js` and `backend/authz.js` to `ba1a66b~1`; the DB will rebuild correctly on next boot.
- To roll back Stage 2: revert `frontend/src/App.jsx`, `frontend/src/index.css`, `frontend/src/pages/PublicEventsPage.jsx`, `vercel.json` to `6eb2b35~1`.
