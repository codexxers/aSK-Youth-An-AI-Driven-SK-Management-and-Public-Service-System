# aSK//YOUTH.AI — project context & change log

**Purpose:** Single place to record **operational and architectural updates** so future edits stay consistent. **AI coding agents:** read this file (and `askyouth-web-only/AGENT_HANDOFF.md` for web-only refactors) **before** large changes to deployment, tunnel, CORS, or env layout.

**Full system narrative (for other AIs / documentation):** see **`SYSTEM_CONTEXT.md`** in this folder — **§0 Study charter** (objectives, scope, limitations, implementation status, agent task guidance), plus actors, topology, APIs, and feature inventory.

**AI agents — read order:** (1) **`SYSTEM_CONTEXT.md` §0** (objectives/gaps), (2) **§2** (production deploy), (3) **§7** (AI/chatbot power), (4) this change log, (5) **`UPDATE TO DO/professor-updates-plan.md`** protected features.

**Chapter 3 diagram prompts:** **`docs/CHAPTER_3_DIAGRAM_PROMPTS.md`** — separate copy-paste prompt per figure (Figures 1–12); prompts assume **mandatory** adviser features (login, SK-patterned + yearly events, mobile, suggestions, admin reports) are **included** so diagrams stay consistent before code catches up.

**How to maintain:** Append a new dated subsection under [Change log](#change-log) whenever you change production behavior, domains, env vars, tunnel scripts, or Vercel/GitHub workflow. One or two sentences per item is enough.

---

## What this system is (short)

- **aSK Youth: An AI-Driven SK Management and Public Service System** (repo product name: **aSK//YOUTH.AI**) — capstone system for **SK Barangay Concepcion Dos, Marikina City**: **chat + RAG**, **events/attendance/budget records**, **official document generation**, **admin analytics**, **Qwen 2.5 7B** (Node/CUDA) + **Python FastAPI** aux services.
- **Production (target env):** **Vercel** hosts UI (from **GitHub** → `askyouth-web-only/`). Browser calls **`https://api.askyouth.online`** via **Cloudflare Tunnel** to **Express + Qwen + Python** on **inference PC**. **Localhost was dev/test only** — not the deployed system.
- **Two frontends in repo:** **`askyouth-web-only/`** = what ships to **GitHub/Vercel**; **`frontend/`** = monorepo dev twin—do not confuse paths when explaining disk size or sync.

---

## Study objectives & scope (summary)

*Full tables, limitations, and agent rules: **`SYSTEM_CONTEXT.md` §0**.*

### General objective

Web-based administrative framework + AI to improve SK management of **youth programs**, **documentation**, and **public services** in **Barangay Concepcion Dos**.

### Specific objectives (what to build toward)

| # | Objective | Build focus |
|---|-----------|-------------|
| **1** | Automate SK **compliance documents** & **resolutions** | `ReportsModule`, `/api/generate-document`, chat `<official_document>` exports |
| **2** | **AI budget estimation** from **historical spend** + **RA 10742** | Extend beyond chat/charts — dedicated estimator / imbalance signals still needed |
| **3** | **Digital records** + **participation tracking** | Events DB done; **per-youth registration / event check-in verification** still a gap |
| **4** | **AI chatbot** for inquiries & service guidance | Core: `/api/chat/stream`, RAG, SK persona — **largely done** |
| **5** | **ISO/IEC 25010** quality evaluation | **Thesis evaluation only** — not an app feature |

### Scope (in) vs limitations (out)

**In scope:** automated admin reports, localized historical data + RA 10742-aware budget help, digital attendance/registration concept, React+Node+Python+LLM mobile web app, AI chatbot.

**Out of scope (do not implement unless user explicitly expands study):** other barangays/LGUs; biometrics; broad multi-language; real-time video; 100% AI accuracy claims; offline public hosting without tunnel + inference PC; sub-6GB GPU only as degraded path.

### Implementation gaps vs thesis (May 2026)

Use this when prioritizing tasks — details in **`SYSTEM_CONTEXT.md` §0.5**.

| Area | Status |
|------|--------|
| Obj. 4 Chatbot | **Attained** |
| Obj. 1 Doc automation | **Partial** — templates + AI export |
| Obj. 2 Budget AI | **Partial** — data + prompt, no estimator module |
| Obj. 3 Participation | **Partial** — aggregate attendance only |
| Obj. 5 ISO 25010 | **N/A in code** |
| Phase 6-B/C SK yearly events | **Not started** |
| Phase 6-D Suggestions UI | **Backend only** |
| Phase 6-A/E Auth + Admin | **Done** |

### How agents should use this folder

1. Map every user task to **objective #1–5** or flag **out of scope**.
2. Read **`SYSTEM_CONTEXT.md` §7** for full **AI/chatbot power** (RAG, Qwen, Python aux, SSE, limits).
3. Assume **§2 production topology** (Vercel + tunnel + PC) — not localhost.
4. Check **protected features** in `UPDATE TO DO/professor-updates-plan.md` before touching `server.js` / `App.jsx` chat or export paths.
5. Ship UI in **`askyouth-web-only/`**; test against `VITE_BACKEND_URL` / `https://api.askyouth.online`.
6. High-value next builds: **budget estimator**, **registration/check-in**, **SuggestionsModule**, **fiscal_year / yearly analytics**.

### AI & chatbot power (short — detail in SYSTEM_CONTEXT §7)

| Area | Production capability |
|------|------------------------|
| **LLM** | Qwen 2.5 7B Instruct (GGUF Q4), self-hosted on PC GPU — no OpenAI/cloud API |
| **Chat** | SSE stream, 2048 max tokens, SK Concepcion Dos persona, EN/Filipino |
| **RAG** | HNSW + 384-dim embeddings, top-5 chunks, thread-scoped, upload PDF/DOCX/txt (≤5×10MB) |
| **Grounding** | Live SQLite events (budget/attendance) + uploaded docs + optional auto-summary |
| **Docs** | `<official_document>` → DOCX/PDF export; Reports templates (Resolution/Minutes/Certificate) |
| **Python aux** | Intent, OCR, summarization, event parser, Plotly analytics — CPU on same PC |
| **Limits** | Single-gen lock; PC+tunnel must be up; no biometric/video/arbitrary translation |

---

## Current deployment model (snapshot)

| Layer | Where it runs | Notes |
|--------|-----------------|--------|
| **Web UI** | **Vercel** (from GitHub repo **`askyouth-web-only/`** path / dedicated repo) | Static **Vite + React** build; `VITE_BACKEND_URL` must point at public API HTTPS origin. **Redeploy after any `VITE_*` env change.** |
| **Public API** | **Cloudflare Tunnel** → `http://localhost:3001` | Hostname **`api.<domain>`** (e.g. acquired **askyouth.online** zone with **`api.askyouth.online`**). Token or cert-based `cloudflared` from project root scripts. |
| **Backend** | Self-hosted PC | **Express** + **node-llama-cpp** (Qwen GGUF, **CUDA**), **SQLite**, RAG. |
| **AI layer** | Same PC | **FastAPI** `:8000`; CPU-oriented auxiliary models per repo design. |
| **Custom domain** | Registrar + **Vercel** (apex/`www`) + **Cloudflare** DNS (`api`, tunnel) | Purchased domain for branded URL; not required for Vercel default URL, required for production-style UX. |

---

## Change log

### 2026-05 — Phase 6-E — Admin Dashboard, Telemetry Logs, & User Management
- Implemented `AdminDashboardModule` frontend interface providing secure administrative telemetry, side-by-side Plotly data analytics (program attendance leaderboard & budget usage pie chart), system trajectory previews, and operational privilege controls.
- Synchronized granular Zero-Trust Role-Based Access Control (RBAC) across local twin (`frontend/src/App.jsx`) and deployed twin (`askyouth-web-only/src/App.jsx`), complete with interactive user provisioning tools for access modification and account deactivation.

### 2026-05 — Infrastructure, tunnel, domain, Vercel

- **Custom domain acquired** for production-style URLs (e.g. **askyouth.online**): UI on apex/`www`, API on **`api.`** subdomain; DNS coordinated between **registrar / Cloudflare** and **Vercel** domain settings.
- **Cloudflare Tunnel operational:** `cloudflared` routes **`https://api.<domain>`** → **`http://localhost:3001`** (Express). Tunnel token read from project root **`cloudflared-tunnel-token.txt`** (JWT line 1) or user profile fallback; launcher **`scripts/run_cloudflare_tunnel.bat`** resolves **`PROOT`** so the token path is reliable when started from **`start_system.bat`** (including **`ROOTNS`** quoting fix for Windows paths).
- **Frontend on Vercel via GitHub:** Deploy source is **`askyouth-web-only/`** (not the monorepo **`frontend/`** tree used for local dev). Workflow: push to GitHub → Vercel build → env **`VITE_BACKEND_URL=https://api.<domain>`** (no trailing slash). See **`askyouth-web-only/DEPLOY.md`**.
- **“Chatbot inactive” / health checks:** Documented that **`/health`** uses permissive CORS while chat requires **`CORS_ORIGINS`** to list every browser origin (Vercel preview, apex, `www`). Inactive page improvements: show resolved health URL + **`[aSK health]`** console logging in **`askyouth-web-only/src/App.jsx`** and **`ChatbotInactivePage.jsx`**; **`DEPLOY.md`** expanded troubleshooting (Access, stale deploy, duplicate repo paths).

### 2026-05 — Backend (Express) reliability behind tunnel

- **`trust proxy` enabled** (default **1** hop, overridable via **`TRUST_PROXY`** / **`TRUST_PROXY_HOPS`**) so **`X-Forwarded-For`** from Cloudflare does not trigger **`express-rate-limit`** **`ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`** (was breaking **`/api`** → browser **`Failed to fetch`** / “UPLINK FAILED”).
- **Rate limiter:** **`validate: { forwardedHeader: false }`** to avoid **`ERR_ERL_FORWARDED_HEADER`** when Cloudflare sends a standard **`Forwarded`** header; **`skip`** on **`OPTIONS`** preflight.
- **`CORS_ORIGINS`:** Extended to include **`https://askyouth.online`** and **`https://www.askyouth.online`** (in addition to localhost and Vercel default app URL) so **`POST /api/chat/stream`** succeeds from the custom domain. **`backend/.env.example`** updated accordingly.

### 2026-05 — Documentation

- **`docs/HARDWARE_AND_INFRASTRUCTURE.md`:** Chapter-style **Operating System**, **Special Software**, **Hardware and Cloud** sections for thesis/beneficiary narrative (Vercel + tunnel + inference PC; custom domain/registrar; placeholders for hostnames where appropriate).
- **`CONTEXT.md`:** This file — ongoing project memory for humans and agents.
- **`SYSTEM_CONTEXT.md`:** Full-stack description for **non-Cursor** AIs (diagrams, thesis narrative): topology, actors, APIs, implemented vs target features.
- **`docs/CHAPTER_3_DIAGRAM_PROMPTS.md`:** One **prompt per figure** (mandatory Fig. 1, 4–9; optional 2, 3, 10–12); diagrams assume **professor-mandatory** modules are present.

---

## Related files (quick index)

| Topic | Location |
|--------|----------|
| Full system context + **study objectives (§0)** | `SYSTEM_CONTEXT.md` |
| **Objectives attainment checklist** | `OBJECTIVES_CHECKLIST.md` |
| Professor phase plan + protected features | `UPDATE TO DO/professor-updates-plan.md` |
| Async implementation checklist | `UPDATE TO DO/ASYNC_UPDATE_PLAN.md` |
| Chapter 3 diagram prompts | `docs/CHAPTER_3_DIAGRAM_PROMPTS.md` |
| Vercel / GitHub / Cloudflare clicks | `askyouth-web-only/DEPLOY.md` |
| Web-only agent continuity | `askyouth-web-only/AGENT_HANDOFF.md` |
| Start all services (Windows) | `start_system.bat` |
| Tunnel launcher | `scripts/run_cloudflare_tunnel.bat` |
| Backend env (CORS, ports, model) | `backend/.env` (local; not committed if sensitive) |
| Backend env template | `backend/.env.example` |
| System requirements prose | `docs/HARDWARE_AND_INFRASTRUCTURE.md` |

---

## Not yet recorded here?

If something shipped but is missing above, **add it under [Change log](#change-log)** with the date you made the change.

### 2026-05-14 — Admin Dashboard Fixes & UX Polish
- **CORS Fix for Admin Analytics:** Added `X-Actor` and `X-Role` to the `allowedHeaders` in `backend/server.js` to resolve "Failed to fetch" (Gateway Error) caused by browser-blocked custom headers during preflight.
- **Audit Logging Seeding:** Initialized `system_logs` and `suggestions` tables with realistic dummy data to prevent empty-state analytics errors and provide immediate system visibility.
- **Enhanced System Tracking:** Implemented granular `writeLog` triggers for administrative data access (viewing stats, audit logs, and user rosters) to fulfill security audit requirements.
- **User-Specific Chat Persistence:** Refactored thread storage to use user-prefixed keys in `localStorage` (`askyouth_threads_${username}`), preventing cross-account conversation leaks on shared devices/browsers.
- **UI/UX Stability:** Fixed triple-dot menu layering by increasing `z-index` and hoisting sidebar stack priority. Added a floating "Scroll to Latest" button in the chat interface for improved long-conversation navigation.

---
**Note to AI Agents/Humans:** whenever adding update or context always put in last or bottom line.

### 2026-05-16 — AI upgrade pack (EXECUTION_PROMPT)
- **backend/llm_config.js** + **timestamp_util.js**: 32768 context, CUDA-first, PH runtime injection.
- **server.js**: Python tool pipeline (context_manager → LLM → language_corrector → tool_router).
- **pm2.ecosystem.config.cjs** in PYDIR for 8 Flask microservices (`--serve` required).
- **OBJECTIVES_CHECKLIST.md**: thesis objectives vs codebase status.

### 2026-05-16 — Study charter + production AI detail
- **`SYSTEM_CONTEXT.md` §0:** Objectives, scope, limitations, agent guidance.
- **`SYSTEM_CONTEXT.md` §2:** Production-only deploy (Vercel + GitHub + tunnel + PC); localhost = dev legacy.
- **`SYSTEM_CONTEXT.md` §7:** Full AI/chatbot capability reference for downstream agents.
- **`CONTEXT.md`:** Summaries + AI power table + read order.

### Session Update: 2026-05-14
- Fixed Admin Dashboard stats by syncing Node telemetry with Python analytics proxy.
- Restored missing hamburger menu buttons in Events and Reports modules.
- Implemented sticky headers with opaque backgrounds for all administrative modules.
- Resolved "triple dot menu" cropping issues by elevating sidebar z-index to 60.
- Implemented user-specific session isolation for chat threads to prevent cross-account leakage.
- Added "Scroll to Bottom" button in chat interface for easier navigation.
- Synchronized all frontend changes to 'askyouth-web-only' and pushed to GitHub.

### Session Update: 2026-05-14 (Mobile View)
- Implemented Phase 6-F: Full mobile responsiveness for viewports down to 375px.
- Sidebar is now a non-shifting overlay on mobile with a dark backdrop.
- Added mobile-only bottom navigation bar for quick module switching.
- Enhanced EventFormModal with responsive grids and mx-4 padding.
- Optimized chat input and module layouts to avoid bottom nav overlap.

### Session Update: 2026-05-14 (Emergency Fix)
- Resolved critical white screen issue in AI Assistant view caused by missing 'messages' variable declaration.
- Added optional chaining and null-coalescing to activeThread usage across the component.
- Synchronized and pushed fix to GitHub.

### Session Update: 2026-05-14 (Mobile Layout & White Screen Fix)
- Restored missing 'formatStamp' helper function (ReferenceError fix).
- Updated layout breakpoints from 'sm' (640px) to 'md' (768px) to fix 'consumed space' on large mobile/small tablet screens.
- Added fallback for 'crypto.randomUUID()' to support older mobile browsers.
- Synchronized and pushed fix to GitHub.

### Session Update: 2026-05-14 (UI Declutter & Navigation Fix)
- Removed Mobile Bottom Navigation bar.
- Optimized mobile layout: Reduced padding, adjusted grid columns (2-col stats), and improved button wrapping.
- Fixed PC Hamburger: Toggle button now always accessible in header, sidebar collapses to 0-width correctly.
- Synchronized and pushed to GitHub.
### Session Update: 2026-05-14 (Navigation Consolidation & Chat Cleanup)
- Consolidated all sidebar toggle buttons into a single global fixed hamburger button (z-[100]) for unified navigation.
- Removed redundant internal toggle buttons from Events, Reports, Admin, and Chat view headers.
- Simplified AI Assistant chat input placeholder text to "Initiate prompt..." for a cleaner look.
- Synchronized and pushed all refinements to GitHub 'askyouth-web-only'.

**UPDATE (2026-05-19): GPU + System RAM Optimization**
- **Issue fixed:** 94% RAM usage + slow responses.
- **Resolution:** useMmap: false set in llm_config.mjs, CPU threads reduced to 4, context ladder capped at 8192 (stable on 24 GPU layers). GPU VRAM now bears the primary KV load without overflowing system RAM ceiling (50%). Faster responses restored.

**UPDATE (2026-05-20): llm_config corrected -- GPU + RAM extended context restored**
- Root cause of May 19 regression identified: `useMmap: false` forced full model weights (~4.5 GB) into System RAM, causing >50% RAM usage.
- Fix applied: `useMmap: true`, `gpuLayers: 32`, `contextSize: 32768`, `kvCacheQuantizationType: q8_0`, `threads: 6`.
- Expected: VRAM ~5.6 GB, System RAM ~7-12 GB, 32768-token context active.

**UPDATE (2026-05-20): RTX 4060 Ti 8GB � VRAM OOM resolved**
- Root cause: kvCacheQuantizationType 'q8_0' was unsupported/broken in installed
  node-llama-cpp version, causing fp16 KV fallback that overflowed 8GB VRAM at
  all context sizes including 8192.
- Fix: kvCacheQuantizationType set to null (fp16 stable), contextSize set to 24576,
  gpuLayers 32, useMmap true.
- Expected: VRAM ~7.0 GB at 24576 ctx, RAM ~5-8 GB. Ladder: 24576->16384->12288->8192.
