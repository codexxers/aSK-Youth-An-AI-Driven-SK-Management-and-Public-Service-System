# aSK//YOUTH.AI — System Overview

Date: 2026-04-12 (updated)
Source: workspace snapshot — Phase 6 (Events & Attendance CRUD + Python AI Layer upgrade) fully implemented and verified

---

## TL;DR

A fully offline, privacy-first AI assistant for Barangay Concepcion Dos SK (Sangguniang Kabataan) that runs a local Qwen 2.5 7B model (`node-llama-cpp`) as a stateful backend service with a React frontend. Users can chat with the AI, upload documents (PDF/DOCX/TXT/MD/CSV) for intelligent Q&A, and query a live SQLite events database. The system uses a persistent HNSW vector store for true semantic retrieval and streams AI responses in real-time via Server-Sent Events.

---

## Architecture

```
[Browser: localhost:5174]
        ↕  fetch() / SSE ReadableStream
[Express backend: localhost:3001]
    ├── Qwen 2.5-7B-Instruct (GGUF, node-llama-cpp, CUDA/Vulkan/CPU)
    ├── HNSW Vector Store (hnswlib-node, on-disk snapshots)
    ├── Embedding model (Xenova/all-MiniLM-L6-v2, @xenova/transformers)
    └── SQLite (better-sqlite3)
           ├── events table (SK programs/events data)
           └── chunk_embeddings table (SHA-256 → Float32 BLOB cache)

[Python AI Layer: ai-layer/main.py — FastAPI + NLP services]
    ├── Intent classification (bart-large-mnli, CPU)
    ├── Summarization (distilbart-cnn-12-6, CPU)
    ├── Embeddings (all-MiniLM-L6-v2, CPU)
    ├── OCR (pytesseract + Pillow + pdf2image)
    ├── Document generation (python-docx + reportlab + Jinja2)
    ├── Events analytics (pandas + plotly — pie/bar/grouped bar charts)
    └── Event document parser (keyword extraction, 12 fields, confidence scores)
```

**Ports:** Backend `3001`, Frontend `5174`  
**Model:** `Qwen2.5-7B-Instruct-Q4_K_M.gguf` (4-bit quantized, loaded from `Qwen25GGUF/`)  
**GPU:** CUDA → Vulkan → CPU auto-fallback; context size 8192→4096→2048→1024→auto progressive fallback

---

## Full Feature Inventory

### Core AI / Inference
- Local Qwen 2.5 7B inference via `node-llama-cpp` v3 — stateful, no external API calls
- Secondary Python AI layer (`ai-layer/main.py`): FastAPI + Uvicorn on port 8000; provides NLP endpoints (intent classification, summarization, embeddings, OCR, document generation, analytics, event document parser). All models run on CPU — GPU VRAM is reserved for Qwen in Node.js.
- GPU backend priority: CUDA → Vulkan → CPU (auto-detected at startup)
- Progressive context size fallback: **8192 → 4096 → 2048 → 1024 → auto** (handles VRAM-limited GPUs)
- Single-thread generation lock prevents concurrent context corruption
- `onToken` callback streams every generated token in real-time
- Maximum generation length: `maxTokens: 2048` (applies to both `/api/chat` and `/api/chat/stream`; grammar rewriter stays at 512)
- Optional grammar rewrite pass (`GRAMMAR_ENFORCEMENT=true` env flag) via dedicated rewriter prompt
- System prompt loaded from `response_styles/response_style.prompt.md` (root of project, versioned, hot-swappable)
  - Extracted via `<!-- SYSTEM_PROMPT_START -->` / `<!-- SYSTEM_PROMPT_END -->` markers
  - Rewriter prompt extracted via `Rewriter instruction:` marker in the same file
  - **Intent routing modes: A (Casual), B (Professional), C (Document Analysis)** — classified before every reply
  - **DOCUMENT DRAFTING RULE (ABSOLUTE)** — applies at all points in conversation; any create/draft/write request triggers `<official_document>` tag output with conversational intro before tags, never after; prohibits fake download links; mixed question+draft answered then tagged
  - **CORE OPERATIONAL CONSTRAINT** — role restriction banning off-topic technical/coding answers
- `<think>` block stripping — chain-of-thought reasoning hidden from UI but preserved
- **Generation lock hardening**: `genLockAcquired` declared outside `try` block so `catch` can always see it; `finally` uses `if (genLockAcquired)` guard before `releaseGenLock()`; `sequence.dispose()` wrapped in its own try/catch to prevent lock freeze on disposal errors

### RAG Pipeline (True Retrieval-Augmented Generation)
- `chunkText()` — paragraph-based chunking with overlap (600-char max, 100-char overlap)
- `embedBatch()` — concurrent embedding in batches of 8 via `@xenova/transformers` (all-MiniLM-L6-v2, 384-dim, ONNX quantized, ~22 MB, auto-downloaded)
- `computeHash()` — SHA-256 per chunk for deduplication and cache keying
- **Persistent HNSW Vector Store** (`HNSWVectorStore` class, `hnswlib-node`):
  - On-disk snapshots: `data/hnsw.index` + `data/hnsw-meta.json`
  - SQLite embedding cache: `chunk_embeddings(hash TEXT PK, vector BLOB)` — no re-embedding on repeated uploads
  - Hash-based dedup: identical chunks never re-indexed
  - Brute-force cosine fallback if native hnswlib-node binary is unavailable
  - Non-blocking async `_save()` via `setImmediate`
- `isCasualQuery()` — semantic gatekeeper; known greetings and short queries without SK-domain keywords bypass vector search entirely, preventing irrelevant RAG citations from appearing in casual replies
- Thread-scoped document store (`threadDocuments` Map): documents uploaded in a thread are persisted in memory keyed by `conversationId` and re-injected into every subsequent turn — no re-upload required
- `buildRagContext()` — unified retrieval called by both chat endpoints:
  1. Persists newly uploaded documents into the thread-scoped store
  2. Indexes new document chunks into the HNSW store
  3. Semantic gating — `isCasualQuery()` skips vector search when no documents are present and the query is trivial
  4. Embeds query → HNSW `searchKnn` → Top-K ranked results (default K=5)
  5. Thread isolation: filters out chunks whose `conversationId` doesn't match the active thread; discards chunks with cosine similarity < 0.20
  6. Injects retrieved passages as `<chunk id="N" source="filename">` blocks
  7. Full-document fallback: if no chunks pass the threshold but the thread has stored docs, re-injects full document text (up to 6000 chars per doc) to prevent context loss on follow-up questions
  8. Runs event keyword detection → injects live SQLite events as authoritative context
  9. Returns `{ finalUserPrompt, eventContext, retrievedChunks }`

### File Upload & Text Extraction
- Up to 5 files per request (configurable via `MAX_FILES` env)
- Hardened `multer`: MIME whitelist + extension whitelist + per-file size cap (`MAX_FILE_SIZE_MB`, default 10 MB)
- Supported formats:
  - **PDF** — `pdf-parse` (CJS, loaded via `createRequire`; guarded with `typeof fn === 'function' ? fn : fn.default` interop for ESM/CJS edge cases)
  - **DOCX** — `mammoth` (HTML conversion → table-preserving cleanup → plain text)
  - **TXT / MD / Markdown / CSV** — UTF-8 decode
  - **application/octet-stream** — decoded as text if extension matches
- Extracted text patched back to frontend via `documents` response field so conversation replay works across turns

### SQL Events Database (SK Programs)
- `better-sqlite3` database at `data/events.db`
- `events` table schema (15 columns): `title, description, category, date, time, location, organizer, status, requirements, contact, attendees, male_count, female_count, staff_count, budget_allotted`
- Schema migration block adds 6 new columns (time, attendees, male_count, female_count, staff_count, budget_allotted) via ALTER TABLE on startup — safe no-op if columns already exist
- Pre-seeded with 8 real SK Concepcion Dos events (sports, scholarship, seminar, livelihood, fun run, cultural, health, etc.) with sample attendance/budget data
- Keyword detection (`EVENT_KEYWORDS` regex, includes budget/attendees/attendance/staff/cultural/health) auto-injects events context into LLM prompt
- Context injection includes time, attendee counts with male/female breakdown (if >0), staff count (if present), and budget (formatted as PHP X,XXX)
- Filters `upcoming` vs. all events based on query intent
- Full CRUD REST API: `GET/POST /api/events`, `PATCH /api/events/:id`, `DELETE /api/events/:id`
- Document parser proxy: `POST /api/events/parse-document` — forwards uploaded file to Python keyword scanner, then optionally calls Qwen AI for low-confidence field extraction fallback

### Streaming (SSE)
- `POST /api/chat/stream` — Server-Sent Events endpoint, primary UI pathway
- SSE event sequence per request:
  1. `{ type: 'phase', phase: 'INDEXING_DOCUMENTS' | 'RETRIEVING_CONTEXT' }` — immediate phase indicator
  2. `{ type: 'phase', phase: 'GENERATING' }` — when generation starts
  3. `{ type: 'retrieved', chunks: [...] }` — retrieved source passages (if any)
  4. `{ type: 'token', token: '...' }` — one event per LLM token (real-time streaming)
  5. `{ type: 'done', ai_data, documents, retrievedChunks }` — final complete reply + metadata
  6. `{ type: 'error', message: '...' }` — on any failure
- TCP `setNoDelay(true)` — disables Nagle's algorithm for immediate delivery
- 15-second SSE keepalive comments — prevents proxy/browser idle timeouts
- `res.on('close')` disconnect guard (NOT `req.on('close')` — critical distinction; req closes after body is consumed, res closes only on true client disconnect)
- `POST /api/chat` — legacy JSON endpoint preserved for backward compatibility (non-streaming)

### Security & Configuration
- `dotenv` — all config from `backend/.env` (never hardcoded):
  - `PORT`, `CORS_ORIGINS`, `MAX_FILE_SIZE_MB`, `MAX_FILES`, `TOP_K`, `VECTOR_STORE_DIR`, `GRAMMAR_ENFORCEMENT`
- CORS whitelist: only origins listed in `CORS_ORIGINS` env var
- `express-rate-limit`: 60 requests/minute per IP on all `/api/*` routes
- Multer file type whitelist: blocks anything not in `ALLOWED_MIME` / `ALLOWED_EXT` sets
- `GET /health` — returns `{ status: 'ok', timestamp }` always
- `GET /ready` — returns 503 if model is still loading, 200 when ready
- Multer error middleware at app bottom catches upload violations with 400 JSON responses

### Conversation Management
- In-memory conversation metadata store (keyed by UUID)
- `POST /conversations` — upsert (create or no-op if exists)
- `PATCH /conversations/:id/rename` — auto-creates if not found
- `PATCH /conversations/:id/pin` — toggles pin state
- `DELETE /conversations/:id` — removes metadata
- Frontend localStorage is source of truth for message history (backend stores only metadata)

### Frontend UI
- React 18 + Vite 5 (`localhost:5174`), Tailwind CSS v4
- **SSE consumer**: native `fetch()` + `response.body.getReader()` + `TextDecoder` with buffer drain on stream end
- **Phase-aware loading UI**:
  - `INDEXING_DOCUMENTS` → spinning SVG ring + "Indexing Documents..."
  - `RETRIEVING_CONTEXT` → spinning SVG ring + "Searching Knowledge Base..."
  - `GENERATING` → live assistant bubble with streaming `<ReactMarkdown>` + blinking cyan cursor
- **Header status badge**: `INDEXING...` / `SEARCHING...` / `GENERATING...` / `SYSTEM ONLINE`
- **Sources panel** (per assistant message): collapsible `<details>`, filename chip, %-match badge (green ≥70%, yellow ≥50%, grey otherwise), "View Snippet" expandable with raw chunk text
- **Thread sidebar**: pinned/unpinned threads, rename inline, delete with confirmation, auto-collapse on mobile
- **File attachment UI**: drag-and-drop zone, per-file chips with remove button, capped at 5 files
- **Thinking panel**: `<think>` blocks stripped from visible response, available in collapsible "Processing Intent" section
- Sidebar module navigation (bottom of sidebar): three module buttons — 💬 AI Assistant, 📅 Events & Attendance, 🗂️ Official Reports; `currentView` state drives main area rendering; Events module shows analytics charts (pie/bar/grouped bar) with interactive plotly charts; Reports module provides template-based document generation
- **Smart Document Export**:
  - `<official_document title="...">` tags parsed from every assistant message via fault-tolerant regex (handles stray leading slash, single/double quotes, `[END OFFICIAL_DOCUMENT]` hallucination, missing closing tag via `$` fallback)
  - Conversational text and document content cleanly separated; document stripped from `<ReactMarkdown>` render
  - Export panel rendered **outside and below** the chat bubble (sibling element, not nested inside), styled as a distinct action card
  - Two export buttons: `↓ Export as DOCX` (blue) and `↓ Export as PDF` (cyan) — both POST to `/api/export/document`
  - Live streaming bubble strips partial `<official_document` tokens to prevent raw XML leaking during generation
  - `handleExport()` downloads blob via programmatic `<a>` click + `URL.revokeObjectURL()` cleanup
- **Export Response Button**: `ExportResponseButton` component rendered on every assistant message with content (not only official documents); provides DOCX/PDF export of the full reply via `/api/export/document`; popup auto-closes on outside click
- Live clock in header (ticks every second, `HH:MM // MM/DD/YYYY` format)
- Auto-scroll to latest message; auto-expanding textarea; Shift+Enter for newlines
- All threads, messages, extracted file text persisted to `localStorage`
- Auto-title: thread title is set from first 30 chars of the user's opening message

---

## Data & Request Flow

```
User types message + optionally attaches files
  ↓
sendMessage() — React
  ├── If files: POST FormData(messages + files[]) → /api/chat/stream
  └── Else:     POST JSON({ messages })           → /api/chat/stream

Backend /api/chat/stream:
  1. setHeader SSE + flushHeaders + setNoDelay(true)
  2. Extract text from files (pdf-parse / mammoth / utf8)
  3. sendEvent INDEXING or RETRIEVING phase
  4. buildRagContext(query, documentsData):
       a. addChunks() → dedup → SQLite cache check → embedBatch() → HNSW addPoint()
       b. embed(query) → HNSW searchKnn() → Top-K chunks
       c. isEventQuery() → fetchEventsAsContext() → eventContext
  5. sendEvent GENERATING phase
  6. acquireGenLock() — serialises concurrent requests
  7. LlamaChatSession.prompt() with onToken → sendEvent token per token
  8. sendEvent done { ai_data, documents, retrievedChunks }
  9. sequence.dispose() + releaseGenLock()
 10. res.end()

Frontend SSE reader:
  - phase events → setStreamPhase() → update header badge + spinner
  - retrieved events → store chunks for Sources panel
  - token events → append to streamingTextRef → live ReactMarkdown render
  - done event → capture finalReply + finalChunks
  - drain residual buffer after stream ends
  - token fallback: if done lost, use accumulated token buffer
  - append assistant message { content, retrievedChunks } to thread
```

---

## Backend API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Always 200 `{ status, timestamp }` |
| GET | `/ready` | 200 when model loaded, 503 while loading |
| POST | `/api/chat` | Legacy non-streaming chat (JSON response) |
| POST | `/api/chat/stream` | **Primary** — SSE streaming chat |
| GET | `/api/events` | List events (optional `?status=&category=`) |
| POST | `/api/events` | Create event |
| PATCH | `/api/events/:id` | Update event fields |
| DELETE | `/api/events/:id` | Delete event |
| POST | `/api/events/parse-document` | Extract event fields from uploaded document (keyword + Qwen AI fallback) |
| POST | `/api/export/document` | **Export** — generate SK letterhead DOCX or PDF from AI-drafted content |
| POST | `/conversations` | Upsert conversation metadata |
| PATCH | `/conversations/:id/rename` | Rename conversation |
| PATCH | `/conversations/:id/pin` | Toggle pin |
| DELETE | `/conversations/:id` | Delete conversation |

---

## Environment Configuration (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend listen port |
| `CORS_ORIGINS` | `http://localhost:5174` | Comma-separated allowed origins |
| `MAX_FILE_SIZE_MB` | `10` | Per-file upload size limit |
| `MAX_FILES` | `5` | Max files per request |
| `TOP_K` | `5` | RAG top-K chunks retrieved |
| `VECTOR_STORE_DIR` | `data` | Directory for HNSW index snapshots |
| `GRAMMAR_ENFORCEMENT` | `false` | Enable second-pass grammar rewrite |

---

## Key Files

| File | Role |
|------|------|
| `backend/server.js` | All backend logic: model init, RAG pipeline, SSE endpoint, events DB (15 columns), conversation management, document export, document parser proxy with AI fallback |
| `backend/.env` | Runtime configuration |
| `backend/data/events.db` | SQLite database (events with attendance/budget data + embedding cache) |
| `backend/data/hnsw.index` | Persistent HNSW vector index |
| `backend/data/hnsw-meta.json` | HNSW chunk metadata + hash→id map |
| `frontend/src/App.jsx` | React UI: threads, SSE consumer, streaming bubble, sources panel, export panel, sidebar module nav |
| `frontend/vite.config.js` | Vite dev config (port 5174) |
| `response_styles/response_style.prompt.md` | System prompt + rewriter prompt template (root of project); contains Mode A/B/C routing and DOCUMENT DRAFTING RULE |
| `Qwen25GGUF/Qwen2.5-7B-Instruct-Q4_K_M.gguf` | Model weights (not in Git) |
| `ai-layer/main.py` | Python AI service: intent classification, summarization, embeddings, OCR, document generation (DOCX/PDF with page borders), events analytics (charts + extended stats), event document parser (keyword extraction) |
| `start_system.bat` | One-click launcher for all 3 services (Python AI, Node.js Backend, Frontend) |
| `stop_system.bat` | One-click shutdown for all 3 services |

---

## Backend Dependencies (with versions)

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^4.19.2 | HTTP server framework |
| `cors` | ^2.8.5 | Cross-origin request handling |
| `express-rate-limit` | ^8.3.2 | Per-IP rate limiting |
| `dotenv` | ^17.4.0 | Environment variable loading |
| `multer` | ^2.1.1 | Multipart file upload handling |
| `mammoth` | ^1.12.0 | DOCX → plain text extraction |
| `pdf-parse` | ^2.4.5 | PDF → plain text extraction |
| `better-sqlite3` | ^12.8.0 | Synchronous SQLite (events DB + embedding cache) |
| `node-llama-cpp` | ^3.1.0 | Local LLM inference (Qwen 2.5 7B) |
| `@xenova/transformers` | ^2.17.2 | Local embedding model (all-MiniLM-L6-v2) |
| `hnswlib-node` | ^3.0.0 | HNSW approximate nearest-neighbour vector index |
| `axios` | ^1.6.8 | HTTP client (utility) |
| `docx` | ^9.6.1 | DOCX generation for SK letterhead export endpoint (ESM import) |
| `pdfkit` | ^0.18.0 | PDF generation for SK letterhead export endpoint (CJS require) |

## Frontend Dependencies (with versions)

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.2.0 | UI framework |
| `react-dom` | ^18.2.0 | React DOM renderer |
| `react-markdown` | ^10.1.0 | Markdown rendering in chat bubbles |
| `tailwindcss` | ^4.2.2 | Utility-first CSS framework |
| `@tailwindcss/vite` | ^4.2.2 | Tailwind v4 Vite integration |
| `@vitejs/plugin-react` | ^4.2.1 | React fast-refresh + JSX transform |
| `vite` | ^5.x | Frontend build tool + dev server |
| `axios` | ^1.6.8 | HTTP client (utility) |

---

## How to Run (Dev)

**Option A — Manual (3 terminals):**
```powershell
# Terminal 1 — Python AI Layer
cd ai-layer
python -m uvicorn main:app --host 0.0.0.0 --port 8000
# → http://localhost:8000

# Terminal 2 — Backend
cd backend
node server.js
# → http://localhost:3001

# Terminal 3 — Frontend
cd frontend
npm run dev
# → http://localhost:5174
```

**Option B — One-click:**
Run `start_system.bat` (starts all 3 services automatically).

## How to Shutdown (Dev)

**Option A — Manual:**
```powershell
$p = Get-NetTCPConnection -LocalPort 3001,5174,8000 -ErrorAction SilentlyContinue
if ($p) {
  $p.OwningProcess | Sort-Object -Unique | Where-Object { $_ -ne 0 } | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
  Write-Host "Stopped processes on ports 3001, 5174, and 8000."
} else {
  Write-Host "No processes found on ports 3001/5174/8000."
}
```

**Option B — One-click:**
Run `stop_system.bat`.

**Smoke test:**
```powershell
curl http://localhost:3001/health
curl http://localhost:3001/ready
```

---

## Known Limitations

- **VRAM**: contextSize progressive fallback: **8192 → 4096 → 2048 → 1024 → auto**. Smaller context = shorter usable conversation history.
- **Single-thread inference**: generation lock serialises requests. Concurrent users must queue. `genLockAcquired` is scoped outside the `try` block; `finally` guards disposal errors so the lock can never be permanently stuck.
- **No authentication**: no user accounts, API keys, or session tokens. Intended for local single-user use.
- **ReactMarkdown unsanitized**: no `rehype-sanitize` — potential XSS if malicious content is injected into documents (low risk in local use).
- **Frontend backend URL hardcoded**: `http://localhost:3001` is in App.jsx, not in `import.meta.env`.
- **No automated tests**: no unit or integration test suite exists yet.
- **No Docker**: native `node-llama-cpp` build requires platform match; no containerization yet.
- **Model size vs. instruction complexity**: The 7B parameter model handles complex multi-instruction tasks significantly better than the previous 3B model. The DOCUMENT DRAFTING RULE enforces `<official_document>` tag compliance for structured document output.

---

## Suggested Next Phase Improvements

- Replace hardcoded `http://localhost:3001` with `import.meta.env.VITE_BACKEND_URL`
- Add `rehype-sanitize` to ReactMarkdown for XSS hardening
- Add per-document include/exclude toggles in the UI
- Add `prom-client` `/metrics` endpoint for observability
- Add `supertest` backend tests for `/health`, `/ready`, `/api/chat`
- Add `Vitest` + React Testing Library tests for frontend
- Add `backend/Dockerfile` + `docker-compose.yml` for portable deployment
- Add `.github/workflows/ci.yml` for automated lint + test pipeline
- Add model download script (`scripts/fetch-model.ps1`) + SHA-256 manifest

---

## Files to Ingest for Full Codebase Understanding

Recommended reading order for AI/human onboarding:
1. `backend/server.js` — complete backend + RAG + SSE
2. `frontend/src/App.jsx` — complete frontend + SSE consumer
3. `backend/.env` — runtime config
4. `response_styles/response_style.prompt.md` — system prompt (root of project)
5. `backend/package.json` — dependency versions
