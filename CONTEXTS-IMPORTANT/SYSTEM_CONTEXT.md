# SYSTEM_CONTEXT — aSK//YOUTH.AI (for documentation & diagram AIs)

**Audience:** External AI tools, thesis writers, or new teammates who need **full-system understanding** without opening the whole repo. Pair with **`CONTEXT.md`** for **recent changes** and **`docs/CHAPTER_3_DIAGRAM_PROMPTS.md`** for **Chapter 3 figure prompts** (including **forward-looking** professor requirements).

**Product:** **aSK Youth: An AI-Driven SK Management and Public Service System** (implementation name: **aSK//YOUTH.AI**) — a **web-based administrative framework** for **Sangguniang Kabataan (SK)** of **Barangay Concepcion Dos, Marikina City**. It combines **program/event records**, **document generation**, **analytics**, and an **AI chatbot** (Qwen 2.5 7B + RAG) so SK officers spend less time on repetitive paperwork and youth get faster, grounded answers.

> **AI agents:** Read **§0** (objectives), **§2** (production deploy — not localhost), **§7** (full AI/chatbot capabilities) before planning work. Map tasks to objectives; use **§0.5** for honest implementation status.

---

## 0. Study charter (objectives, scope, limitations)

*Source: capstone **Objectives of the Study** and **Scope and Limitation of the Study**. This section is the north star for product decisions; technical detail lives in later sections.*

### 0.1 General objective

Develop a **web-based administrative framework** that improves efficiency of managing **youth programs**, **documentation**, and **public services** for SK Barangay Concepcion Dos through **artificial intelligence**.

### 0.2 Specific objectives (thesis → system)

| # | Thesis objective | What the system must do | Primary modules / code |
|---|------------------|-------------------------|-------------------------|
| **1** | Automate preparation of **official SK compliance documents** and **project resolutions** to reduce repetitive manual admin work | Template-based generation + AI-drafted exports with SK letterhead | `ReportsModule` → `POST /api/generate-document` (Resolution, Minutes, Certificate); chat `<official_document>` → `POST /api/export/document`; `response_styles/response_style.prompt.md` drafting rules |
| **2** | **AI-driven project budget estimation** analyzing **historical expenditure** to assist financial planning and detect **budget imbalances** | Recommendations grounded in local spend history + **RA 10742** policy context | SQLite `events.budget_allotted`; admin `GET /api/admin/budget`; chat event/budget context injection; RAG over uploaded SK financial docs — **no dedicated “Budget Estimator” module yet** |
| **3** | **Digital record-keeping** and **participation tracking** replacing manual registration; **centralized** admin reports | Persistent events DB + attendance aggregates + analytics/export | SQLite `events` (attendees, gender split, staff, budget); `EventsAnalyticsModule`; `AdminDashboardModule` — **per-youth registration / QR check-in verification not built** |
| **4** | **AI-powered chatbot** for SK inquiries and guiding users through administrative services | Streaming Q&A, RAG on uploads, SK-only persona | `POST /api/chat/stream`, HNSW RAG, file upload, thread management — **core product, largely complete** |
| **5** | Use **ISO/IEC 25010** to measure and evaluate design, performance, and usability | Capstone **evaluation** (surveys, tests, metrics) — **not a runtime software feature** | Document in thesis Ch. 4–5; agents may help design test plans but do not implement “ISO module” in code |

### 0.3 Scope (in scope for the study)

- Automate generation of **administrative records and reports** for SK project implementation and **official compliance**.
- Use a **localized dataset** of historical SK records and **RA 10742** for **context-aware AI budget guidance** (prompt + data + RAG; full estimator still evolving).
- **Digital verification** concept for monitoring **registrations and attendance** at SK-led youth events — *thesis scope; implementation today is **aggregate attendance in events DB** + analytics, not individual check-in gates*.
- **Web architecture:** React.js, Node.js, Python, **LLM** (Qwen 2.5 7B), **mobile-responsive** UI (Vercel SPA + responsive CSS).
- **AI chatbot** for internal SK communication and information dissemination.

### 0.4 Limitations (explicitly out of scope — do not build unless user overrides)

| Limitation | Implication for development |
|------------|----------------------------|
| **Only Barangay Concepcion Dos** | All copy, seeds, prompts, and examples stay local; refuse other barangays/LGU workflows in AI persona. |
| **No integration with other LGUs** or non-SK operations | No external government APIs, no multi-barangay tenancy. |
| **No biometric verification**, **no multi-language** (beyond English/Filipino in chat), **no real-time video** | Do not add fingerprint/face login, arbitrary translation services, or live video pipelines. |
| **No guarantee of 100% AI accuracy** when historical data is incomplete | UI and prompts must state assumptions; prefer structured templates + human review for official docs. |
| **Stable internet** required for production use | **Target environment:** Vercel UI → Cloudflare Tunnel → inference PC. No offline public mode. PC + tunnel must be up for chat/AI. |
| **Local inference hardware:** GPU with **≥ 6 GB VRAM** recommended for Qwen GGUF (Q4_K_M ~4.7 GB) | Document in `docs/HARDWARE_AND_INFRASTRUCTURE.md`; CPU fallback exists but slower. |

### 0.5 Implementation status vs objectives (snapshot — verify in code before citing)

*Last aligned to codebase: **May 2026**. Re-check `backend/server.js` and `askyouth-web-only/src/App.jsx` after major phases.*

| Objective / scope item | Status | Notes |
|------------------------|--------|--------|
| **Obj. 1** — Compliance docs & resolutions | **Partial (~75%)** | Strong: templates + AI export. Gap: full compliance workflow automation for all DILG document types. |
| **Obj. 2** — AI budget estimation | **Partial (~45%)** | Data + charts + chat/RA 10742 in prompt; gap: dedicated estimator, imbalance alerts, structured RA 10742 KB. |
| **Obj. 3** — Records + participation tracking | **Partial (~30%)** | Centralized SQLite + manual aggregate attendance; gap: per-youth registration, QR/digital verification at events. |
| **Obj. 4** — AI chatbot | **Attained (~95%)** | Streaming, RAG, uploads, SK persona — primary deliverable. |
| **Obj. 5** — ISO 25010 evaluation | **Outside codebase** | Thesis evaluation activity; agents help with test design, not a product feature. |
| Scope — React/Node/Python/LLM/mobile | **Attained (~90%)** | Three-tier stack + Vercel + tunnel deploy. |
| Scope — Admin report automation | **Partial** | Reports module + exports; not every SK form automated. |
| Professor Phase **6-A** Auth | **Done** | JWT, roles, `LoginPage`. |
| Phase **6-B** SK-pattern events (`fiscal_year`, `sk_program`) | **Not done** | Planned in `UPDATE TO DO/professor-updates-plan.md`. |
| Phase **6-C** Yearly events heatmap | **Not done** | No `type=yearly` in analytics yet. |
| Phase **6-D** Suggestions UI | **Half** | Backend `suggestions` table + API; **no** `SuggestionsModule` / `currentView === 'suggestions'` in SPA. |
| Phase **6-E** Admin dashboard & logs | **Done** | Stats, budget/participation charts, users, `system_logs`. |
| Phase **6-F** Mobile responsive | **Mostly done** | Responsive CSS; bottom nav removed later — verify current `App.jsx`. |

### 0.6 Guidance for AI agents (how to think about new tasks)

When the user proposes an idea or task, map it using this order:

1. **Which objective (1–5) or scope bullet does it serve?** If none, flag as out-of-scope or ask whether they want to expand the study.
2. **Respect limitations (§0.4).** Do not propose biometrics, other barangays, or “100% accurate AI” promises.
3. **Prefer extending existing modules** over new stacks: chat/RAG (`server.js` + `App.jsx`), events SQLite, Python `ai-layer/main.py`, `ReportsModule`, `AdminDashboardModule`.
4. **Close known gaps** in priority order if the user is driving capstone completion:
   - **High thesis fit:** Obj. 2 budget estimator UI/API; Obj. 3 registration/check-in (simple QR + `registrations` table); Obj. 1 more document templates.
   - **Professor plan:** Phase 6-B → 6-C → 6-D (suggestions screen) — see `UPDATE TO DO/ASYNC_UPDATE_PLAN.md` and `professor-updates-plan.md`.
5. **Protected features:** Never break items listed in `UPDATE TO DO/professor-updates-plan.md` **Protected Features Registry** (chat stream, RAG, export letterhead, events CRUD, etc.).
6. **Deploy path:** Ship UI changes in **`askyouth-web-only/`** and sync from **`frontend/`** when applicable; backend stays on inference PC behind tunnel.
7. **Diagrams / thesis prose:** May assume adviser-mandatory features exist for figures; label **“target”** vs **“implemented”** in running text.

**Quick capability map (what exists today):**

- **Chat + RAG + official doc tags** — youth/officer/admin (role-gated nav).
- **Events CRUD + attendance/budget fields + Plotly analytics** — officer+.
- **Official Reports** (Resolution, Minutes, Certificate) — officer+.
- **Admin dashboard** (stats, logs, users, budget/participation charts) — admin/chairman.
- **Auth** — all modules behind JWT; roles: `admin`, `chairman`, `officer`, `youth`.

---

## 1. Actors

| Actor | Role |
|--------|------|
| **Youth / resident** | Uses chat, views events, submits **suggestions**, uses **mobile** layout. |
| **SK officer / moderator** | Curates **SK-patterned events**, may review suggestions. |
| **System administrator** | **Login / roles**, **reports** (exports, analytics), system configuration. |
| **Anonymous visitor** | May hit **login** or marketing landing only in target design; current build may allow anonymous chat per deployment policy. |

---

## 2. Production deployment (authoritative — not localhost)

> **For all agents and thesis narrative:** The **target / production environment** is **Vercel (frontend) + GitHub (source) + Cloudflare Tunnel (API edge) + dedicated inference PC (backend + AI)**. Earlier **localhost:5174 / localhost:3001** setups were **development and testing only** — do **not** describe them as the deployed system. Users in production open the **public HTTPS URL**; they never run the monorepo locally to use the app.

### 2.1 Topology (how production traffic flows)

```
[User browser — desktop or mobile, any network]
        │
        │ HTTPS — UI origin (e.g. https://askyouth.online or https://ask-youth.vercel.app)
        ▼
[Vercel] — static SPA build from GitHub repo (path: askyouth-web-only/)
        │     Env at build time: VITE_BACKEND_URL=https://api.askyouth.online
        │
        │ fetch(), multipart upload, SSE ReadableStream (long-lived)
        ▼
[Cloudflare DNS + TLS] — api.askyouth.online (API subdomain only; not on Vercel)
        │
        │ Cloudflare Tunnel (cloudflared connector on inference PC)
        ▼
[Inference PC — beneficiary / lab machine]
        ├── Express :3001 — JWT, SQLite, chat/RAG, proxies, rate limit, CORS
        ├── FastAPI :8000 — embeddings, OCR, summarization, intent, doc templates, analytics
        ├── SQLite — events.db, users, suggestions, system_logs, chunk_embeddings
        ├── HNSW index on disk — data/hnsw.index + hnsw-meta.json
        └── GPU (CUDA) — Qwen2.5-7B-Instruct Q4_K_M GGUF via node-llama-cpp
```

### 2.2 Production URLs and repos (reference)

| Piece | Typical value | Notes |
|--------|----------------|--------|
| **Frontend (Vercel)** | `https://askyouth.online`, `https://www.askyouth.online`, or `https://ask-youth.vercel.app` | Built from **`askyouth-web-only/`** pushed to **GitHub** (`codexxers/aSKYouth` or project repo). |
| **API (tunnel)** | `https://api.askyouth.online` | Must match **`VITE_BACKEND_URL`** in Vercel (no trailing slash). |
| **Health probe** | `GET https://api.askyouth.online/health` | SPA polls this; **503 on `/ready`** until Qwen finished loading. |
| **CORS** | `CORS_ORIGINS` in `backend/.env` on PC | Must list **every** UI origin (Vercel default URL, apex, www). |
| **Tunnel config** | Cloudflare Zero Trust → Public Hostname | `api` + domain → `http://localhost:3001`. Launcher: `scripts/run_cloudflare_tunnel.bat`. |

### 2.3 Operational requirements (production)

| Requirement | Why it matters |
|-------------|----------------|
| **Inference PC powered on** | All AI (Qwen), RAG index, SQLite, and Python aux run here — not on Vercel. |
| **`cloudflared` healthy** | Without tunnel, Vercel UI shows **Chatbot inactive / UPLINK FAILED**. |
| **Node + Python services running** | `start_system.bat` or equivalent: FastAPI `:8000` then Express `:3001`. |
| **Internet at user and at PC** | Browser → Cloudflare → tunnel → PC; no LAN-only assumption for public users. |
| **GPU recommended (≥6 GB VRAM)** | Qwen Q4_K_M; CPU fallback possible but slow under load. |
| **Vercel redeploy after env change** | `VITE_*` baked at build time. |

### 2.4 What is NOT production

| Item | Status |
|------|--------|
| `localhost:5174` Vite dev server | Dev/test only |
| `localhost:3001` direct API from browser on another machine | Dev/test only (CORS may allow localhost origin during development) |
| Monorepo `frontend/` without sync to `askyouth-web-only/` | Not what Vercel ships unless manually aligned |
| “Fully offline public app” | **Out of scope** for hosted deployment — matches study limitation on internet for web-hosted AI |

**Deploy docs:** `askyouth-web-only/DEPLOY.md` — Vercel clicks, Cloudflare DNS, tunnel, Access pitfalls for SSE.

---

## 3. Repository layout (what lives where)

| Path | Role |
|------|------|
| **`askyouth-web-only/`** | **Canonical** frontend for **GitHub → Vercel**. No backend weights. **This is production UI source.** |
| **`frontend/`** | Monorepo **dev twin** — sync to `askyouth-web-only/` before push; **not** the deployed artifact by default. |
| **`backend/`** | **Express** `server.js`: chat/RAG, events API, exports, SQLite, **node-llama-cpp**. |
| **`ai-layer/`** | **FastAPI**: intent, summarization, embeddings, OCR-related routes; **CPU**-biased to spare GPU for Qwen. |
| **`scripts/`** | **`run_cloudflare_tunnel.bat`**, etc. |
| **`start_system.bat`** | Starts Python → Node → optional tunnel → local Vite (paths vary by machine). |
| **`docs/`** | Hardware narrative, **Chapter 3 diagram prompts**, etc. |

---

## 4. Major features (current + target for diagrams)

**Implemented or partially present (verify codebase before claiming in prose):**

- **Chat** with **streaming** responses (`POST /api/chat/stream`), **file uploads** (PDF, DOCX, images, text), **RAG** over thread documents and vector retrieval (**hnswlib-node** + embeddings from Python or fallback).
- **Events** stored in **SQLite** (`events` table): CRUD via **`/api/events`**, categories aligned to SK-style programs; seed data references **Barangay Concepcion Dos** style content.
- **Analytics** routes (e.g. events analytics) and **document export** (DOCX/PDF) in backend.
- **Health** endpoint for uptime; **CORS** restricted for API routes; **`trust proxy`** + rate-limit tuning for **Cloudflare**.
- **Admin Dashboard & Telemetry Logs** — Secure visual gateway (`AdminDashboardModule`) providing real-time data analytics, system audit trails via `system_logs`, and user access tier provisioning.
- **Authentication Gateway** — Granular zero-trust integration across client interfaces driven by JSON Web Tokens (`JWT`) and secure storage mechanisms.

**Professor-mandatory (Phase 6 — see `UPDATE TO DO/professor-updates-plan.md`):**

| # | Feature | Code status (May 2026) |
|---|---------|-------------------------|
| 1 | Login + JWT + RBAC | **Implemented** (6-A) |
| 2 | SK-pattern events (`fiscal_year`, `sk_program`, DILG-aligned categories) | **Planned, not in DB/UI yet** (6-B) |
| 3 | Events list/filter/CRUD | **Implemented** (base + attendance/budget) |
| 4 | Yearly events heatmap / timeline | **Planned** (6-C) |
| 5 | Mobile-responsive SPA | **Mostly implemented** (6-F; verify current nav in `App.jsx`) |
| 6 | Suggestions module | **API + table only**; UI screen missing (6-D) |
| 7 | Admin reports / dashboard | **Implemented** (6-E) |

When generating **Chapter 3 diagrams**, advisers often want **all seven** shown; label **implemented vs target** in thesis captions where honesty is required.

---

## 5. Data & persistence

- **SQLite** (`backend/data/events.db`): **`events`** table with fields including title, description, category, date, time, location, organizer, status, requirements, contact, attendance splits, budget, etc. Migrations may add columns over time.
- **System Trajectory Logs:** **`system_logs`** table tracking action actor, role privilege, command targets, payload details, and originating source IP address.
- **User Operator Roster:** **`users`** table governing internal administrative accounts, roles (`admin`, `chairman`, `officer`, `youth`), status flags, and `bcryptjs` password hashes.
- **Vector / RAG:** persistent index under configured `VECTOR_STORE_DIR`; thread-scoped document text in memory maps (see `server.js` patterns).
- **Target ERD** (for diagrams): add **`users`**, **`suggestions`**, **`report_runs`**, **`sessions`** as in **`docs/CHAPTER_3_DIAGRAM_PROMPTS.md`**.

---

## 6. Key HTTP surface (conceptual)

| Area | Examples |
|------|-----------|
| Health | `GET /health`, `GET /ready` |
| Chat | `POST /api/chat/stream` (SSE-style stream), non-stream chat variant if present |
| Events | `GET/POST/PATCH/DELETE /api/events`, document parse endpoint |
| Export | `POST /api/export/document`, `POST /api/generate-document` |
| Analytics | `GET /api/analytics/events`, `GET /api/admin/stats`, `GET /api/admin/participation`, `GET /api/admin/budget` |
| Admin / Audit | `GET /api/admin/logs`, `GET/POST/PATCH/DELETE /api/users` |
| Auth Gateway | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Suggestions | `GET/POST /api/suggestions`, `PATCH /api/suggestions/:id` |

---

## 7. AI & chatbot — detailed capability reference (production)

*This section describes **what the AI can actually do today** when the production stack (§2) is healthy. Use it to gauge system power before proposing features.*

### 7.1 Architectural split (where intelligence runs)

| Layer | Runs on | Responsibility |
|--------|---------|----------------|
| **Qwen 2.5 7B Instruct** | Inference PC GPU (CUDA → Vulkan → CPU fallback) | All **generative** chat replies, optional low-confidence **event field extraction** fallback, grammar rewrite pass if enabled |
| **Node Express** | Inference PC | RAG orchestration, file text extraction, SSE streaming, SQLite event injection, export proxy, auth, rate limits |
| **Python FastAPI** | Inference PC CPU | Embeddings, intent classification, summarization, OCR, template DOCX/PDF, Plotly analytics — **does not host Qwen** |
| **React SPA** | Vercel CDN | UI only — sends messages/files to `VITE_BACKEND_URL`; stores chat threads in **browser `localStorage`** (per username) |

**Privacy model (production):** User messages and uploads go **browser → Cloudflare → tunnel → PC**. Inference stays on the **beneficiary PC**; Vercel never sees the GGUF model or SQLite files. No third-party cloud LLM API (OpenAI, etc.) — **fully self-hosted Qwen**.

### 7.2 Primary LLM — Qwen 2.5 7B Instruct

| Attribute | Detail |
|-----------|--------|
| **Model file** | `Qwen2.5-7B-Instruct-Q4_K_M.gguf` (~4.7 GB), in project `Qwen25GGUF/` on inference PC |
| **Runtime** | `node-llama-cpp` v3, `LlamaChatSession` |
| **Endpoint** | `POST /api/chat/stream` (primary); `POST /api/chat` (legacy JSON, non-stream) |
| **Context size** | Progressive fallback on load: 8192 → 4096 → 2048 → 1024 → auto (VRAM-dependent) |
| **Generation** | `maxTokens: 2048`, `temperature: 0.7`; single **generation lock** — one inference at a time per server |
| **System persona** | Loaded from `response_styles/response_style.prompt.md` between `SYSTEM_PROMPT_START` / `END` markers |
| **Optional rewrite** | `GRAMMAR_ENFORCEMENT=true` in `backend/.env` — second pass, max 512 tokens |

**Persona power (what Qwen is instructed to do):**

- Act only as **aSK Youth** assistant for **Barangay Concepcion Dos SK** — refuse unrelated coding/general AI tasks.
- Cite **RA 10742** and **localized historical SK data** for budget/policy answers; state assumptions; never fabricate legal text or numbers.
- **Intent routing** (Modes A/B/C): casual chat vs structured admin steps vs document-upload acknowledgment.
- **Languages:** English and Filipino (Tagalog detected via Python `POST /detect-language` when available).
- **Official document drafting:** Must wrap drafts in `<official_document title="...">...</official_document>` for UI export.
- **Live events:** When query matches event keywords, `[DATABASE: EVENTS]` block injected from SQLite — model must not invent events.

### 7.3 RAG (Retrieval-Augmented Generation) — semantic memory

| Capability | Detail |
|------------|--------|
| **Vector store** | `HNSWVectorStore` (`hnswlib-node`) with on-disk `hnsw.index` + `hnsw-meta.json`; brute-force cosine fallback if native lib missing |
| **Embedding dim** | 384 (`all-MiniLM-L6-v2`) |
| **Embedding source** | **Primary:** Python `POST /embed` (sentence-transformers, CPU). **Fallback:** Xenova `@xenova/transformers` in Node |
| **Chunking** | ~600 chars, 100-char overlap, paragraph-aware |
| **Dedup / cache** | SHA-256 per chunk → SQLite `chunk_embeddings` — re-upload same text does not re-embed |
| **Top-K** | Default **5** chunks (`TOP_K` env) |
| **Similarity floor** | Chunks below **0.20** cosine similarity discarded |
| **Thread isolation** | Retrieved chunks filtered to **current `conversationId`** only |
| **Casual gate** | Short/non-SK queries skip vector search when no docs in thread (prevents irrelevant citations on “hi”) |
| **Thread document memory** | Uploads persist in server `threadDocuments` Map per thread — follow-up questions without re-upload |
| **Full-doc fallback** | If no chunk passes threshold but thread has docs, inject up to **6000 chars/doc** |
| **Long upload summarization** | If combined upload text **>3000 chars**, Python **distilbart** summary prepended as high-priority synthetic chunk |
| **Sources UI** | SSE `retrieved` event → collapsible **Sources panel** per message (% match, snippet) |

**Supported upload types (chat):** PDF (`pdf-parse`), DOCX (`mammoth`), TXT/MD/CSV, images (via extraction path); max **5 files**, **10 MB** each (env-tunable); MIME + extension whitelist.

### 7.4 Python AI layer — auxiliary intelligence (CPU on same PC)

All routes on `PYTHON_SERVICE_URL` (default `http://localhost:8000`), called by Node — **not directly by Vercel browser** except via Node proxy.

| Feature | Endpoint | Model / tool | Used for |
|---------|----------|--------------|----------|
| Intent classification | `POST /classify-intent` | `facebook/bart-large-mnli` zero-shot | Modes A/B/C routing context in RAG |
| Language detection | `POST /detect-language` | `langdetect` | Filipino reply hint |
| Embeddings | `POST /embed` | `all-MiniLM-L6-v2` | RAG index + query vectors |
| Summarization | `POST /summarize` | `sshleifer/distilbart-cnn-12-6` | Long multi-doc uploads |
| OCR | `POST /ocr` | Tesseract + Poppler | Scanned PDF / images (if binaries installed on PC) |
| Event doc parser | `POST /parse-event-document` | Regex + optional OCR | Auto-fill event form fields (12 fields + confidence) |
| Template documents | `POST /generate-document` | python-docx + reportlab + Jinja2 | Resolution, Minutes, Certificate with SK letterhead |
| Events analytics | `GET /analytics/events` | pandas + plotly | Pie/bar/attendance charts in Events module |

If Python is down: embeddings fall back to Xenova; summarization/intent/OCR/analytics may degrade or fail gracefully with console warnings.

### 7.5 Chat streaming UX (production browser → API)

| SSE phase | Meaning | UI |
|-----------|---------|-----|
| `INDEXING_DOCUMENTS` | Chunking + embedding uploads | Spinner “Indexing Documents…” |
| `RETRIEVING_CONTEXT` | Vector search + event DB lookup | “Searching Knowledge Base…” |
| `GENERATING` | Qwen token stream | Live markdown + cursor |
| `retrieved` | RAG chunk metadata | Sources panel |
| `token` | Partial LLM output | Streamed bubble |
| `done` | Final text + `documents` + `retrievedChunks` | Export buttons, thread save |
| `error` | Failure message | Error state |

**Transport notes for production:** SSE over HTTPS through Cloudflare Tunnel; **15s keepalive** comments; `setNoDelay` on socket; client disconnect via `res.on('close')`. **Cloudflare Access** on `api.*` can break SSE — test without Access first (`DEPLOY.md`).

**Post-processing on server:** `<think>...</think>` blocks stripped from stream (chain-of-thought hidden from user, not shown in UI thinking panel from stream path).

### 7.6 Document & export intelligence (beyond chat text)

| Output path | Trigger | Format |
|-------------|---------|--------|
| **Chat official export** | Assistant message contains `<official_document>` | User clicks Export DOCX/PDF → `POST /api/export/document` (SK letterhead) |
| **Any assistant reply export** | `ExportResponseButton` on each message | Same export API — full reply body |
| **Reports module** | Officer+ fills template form | `POST /api/generate-document` → Resolution / Minutes / Certificate |
| **Event import** | Upload doc in event form | `POST /api/events/parse-document` → Python parser + optional Qwen field fill |

Chat can **draft**; Reports module can **generate from structured fields** without LLM. Both produce **downloadable** office files on the PC-backed API.

### 7.7 Live data injection (non-RAG “grounding”)

| Source | When injected | Data |
|--------|---------------|------|
| **SQLite events** | Query matches `EVENT_KEYWORDS` regex | Titles, dates, times, locations, status, attendees, gender split, staff, **budget_allotted** (PHP formatted) |
| **Thread uploads** | Files attached this turn or prior in thread | Full text or RAG chunks |
| **Seeded Concepcion Dos events** | DB query | ~8 sample programs (sports, scholarship, Linggo ng Kabataan, etc.) unless replaced |

This gives the chatbot **factual program schedules and spend figures** without hallucinating from training data alone — when the DB block is present.

### 7.8 Authentication & role gates (who gets AI + modules)

| Role | Chat + RAG | Events | Reports | Admin |
|------|------------|--------|---------|-------|
| `youth` | Yes | No | No | No |
| `officer` | Yes | CRUD + analytics | Yes | No |
| `chairman` | Yes | Yes | Yes | Dashboard (no log write on users) |
| `admin` | Yes | Yes | Yes | Full dashboard + logs + user CRUD |

Production: **`LoginPage`** → JWT in `sessionStorage` → `Authorization: Bearer` on API calls. Backend down → **`ChatbotInactivePage`** after health poll fails.

### 7.9 Explicit limits — what the AI does NOT do

- No **cloud LLM APIs** — power capped by local Qwen 7B + RAG corpus size.
- No **biometric** identity, **multi-language** beyond EN/Filipino, **live video** analysis (per study + prompt).
- No **per-attendee QR verification** in chat pipeline (aggregate attendance only in events DB).
- No **guaranteed legal/financial accuracy** — human review expected for official submissions.
- No inference when **`/ready` returns 503** (model still loading) or PC/tunnel offline.
- **Concurrent users** share one generation lock — second chat request waits (throughput limit on single GPU PC).

### 7.10 Power summary for downstream AI planners

**Strong today:** SK-scoped conversational assistant with **streaming**, **document Q&A (RAG)**, **live event/budget context**, **official document drafting + export**, **template report generation**, **OCR/parser aux**, **role-based web app** on Vercel with **self-hosted** model.

**Moderate:** Budget **advice** via chat + charts — not a dedicated **estimator engine**. Event **attendance** as **totals**, not individual verification.

**Weak / missing:** Suggestions UI, SK fiscal-year program taxonomy (6-B), yearly heatmap (6-C), structured RA 10742 document KB, ISO 25010 in code.

**When suggesting work:** Extend §7 capabilities before adding new stacks; respect §2 production path (ship `askyouth-web-only`, test against `https://api.askyouth.online`).

---

## 8. AI stack split (quick reference)

| Resource | Consumer |
|----------|----------|
| **GPU VRAM** | Qwen 2.5 7B (node-llama-cpp, CUDA) |
| **CPU / RAM** | Python transformers, OCR, embeddings, analytics |
| **Disk** | GGUF weights, SQLite, HNSW index, Xenova cache |
| **Vercel** | Static JS/CSS only — zero AI compute |

---

## 9. Security & ops (conceptual)

- **TLS** at Cloudflare edge; tunnel to **localhost** avoids opening router ports.  
- **Secrets:** tunnel token file (gitignored), Vercel env vars, `backend/.env` on PC.  
- **Rate limiting** behind **`trust proxy`**; validate **`Forwarded`** header behavior tuned for Cloudflare.
- **Auditing / RBAC:** Centralized verification hooks validating user permissions via request context attributes and header properties.

---

## 10. File pointers for humans

| Need | Open |
|------|------|
| Deploy steps | `askyouth-web-only/DEPLOY.md` |
| Web-only scope | `askyouth-web-only/AGENT_HANDOFF.md` |
| Ops changelog | `CONTEXT.md` |
| Thesis hardware chapter | `docs/HARDWARE_AND_INFRASTRUCTURE.md` |
| Diagram prompts | `docs/CHAPTER_3_DIAGRAM_PROMPTS.md` |

---

*Version: updated May 2026 — §0 Study charter, **§2 Production deployment**, **§7 AI/chatbot capability reference**.*

## 11. Recent Operational Updates (May 14, 2026)
- **Unified Navigation & Layering:** Restored sidebar toggle visibility across all modules and resolved triple-dot menu layering issues with elevated `z-index` and stack priority.
- **Role-Based Security & Routing:** Enforced role-specific landing views (Admins → Dashboard). Updated CORS policy to permit custom `X-Actor`/`X-Role` headers for administrative telemetry.
- **Data Privacy:** Implemented user-specific thread isolation in browser storage to prevent session data leakage between different accounts.
- **Enhanced Auditability:** Expanded system audit logs with automated seeding of realistic telemetry and tracking of administrative data access events.

---
**Note to AI Agents/Humans:** whenever adding update or context always put in last or bottom line.

### 2026-05-16 — AI upgrade pack (EXECUTION_PROMPT)
- **backend/llm_config.cjs** + **timestamp_util.cjs**: 32768-token context, runtime role/timestamp/tools injection.
- **server.js**: Python microservice pipeline (context → LLM → language → tool_router).
- **pm2.ecosystem.config.cjs** in PYDIR for 8 Flask tools on ports 5000–5008.
- **OBJECTIVES_CHECKLIST.md**: thesis objectives attainment table.

### 2026-05-16 — Production deploy + AI capability detail
- **§2** rewritten: Vercel + GitHub + Cloudflare Tunnel + inference PC = **authoritative** environment; localhost marked dev-only.
- **§7** added: full chatbot/RAG/Qwen/Python aux reference, SSE phases, limits, power summary for planners.

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
