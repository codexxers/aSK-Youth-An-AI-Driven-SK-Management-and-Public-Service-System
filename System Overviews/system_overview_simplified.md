# aSK//YOUTH.AI — System Overview (Simplified)

Date: 2026-04-12 (updated)
Source: workspace snapshot — Phase 6 (Events & Attendance CRUD + Python AI Layer upgrade) fully implemented and verified

---

## What Is This?

aSK//YOUTH.AI is a fully offline, privacy-first AI assistant built for Barangay Concepcion Dos SK (Sangguniang Kabataan). It runs entirely on your local machine — no internet connection required, no data sent to the cloud. Youth officers and community members can chat with the AI, upload documents for intelligent Q&A, and get information about SK events and programs.

---

## System Architecture (Plain English)

The system has two main parts: a **backend** (the brain) and a **frontend** (the face).

**Backend** runs on port 3001 and handles everything behind the scenes:
- Loads and runs the Qwen 2.5 7B AI model locally on your machine
- Manages a vector database that stores the meaning of uploaded documents
- Hosts a SQLite database containing SK events and programs (with attendance tracking and budget data)
- Streams AI responses back to the browser token-by-token in real time
- Proxies requests to the Python AI Layer and optionally uses Qwen AI for document field extraction fallback

**Python AI Layer** runs on port 8000 and provides specialized NLP services:
- Intent classification, text summarization, and text embeddings (all on CPU)
- OCR for scanned documents and images (Tesseract + Poppler)
- Template-based document generation (SK letterhead DOCX/PDF with page borders)
- Events analytics dashboard (charts and stats via pandas + plotly)
- Event document parser (keyword-based field extraction from uploaded documents)

**Frontend** runs on port 5174 and is what users actually see:
- A React web app in the browser
- Chat interface with thread management (create, pin, rename, delete conversations)
- File upload zone for documents (including Ctrl+V paste for images)
- Live streaming display of AI responses as they're generated
- Events & Attendance analytics with interactive charts

The browser talks to the backend using a technology called **Server-Sent Events (SSE)**, which allows the backend to push data to the browser continuously without the browser having to keep asking for it.

---

## AI Model

- **Model:** Qwen 2.5-7B-Instruct (4-bit quantized GGUF format, ~4.7 GB)
- **Inference library:** node-llama-cpp v3 (primary); Python llama_cpp via FastAPI at `ai-layer/main.py` (secondary, experimental)
- **Runs completely offline** — the model file lives in the `Qwen25GGUF/` folder
- **GPU support:** Automatically tries CUDA, then Vulkan, then falls back to CPU
- **Context window:** Tries 8192 tokens first, then falls back to 4096 → 2048 → 1024 → auto if GPU memory is insufficient. Larger context means the AI can remember more of a long conversation.
- **Generation length:** Each AI response can generate up to 2048 tokens before stopping.
- **Generation lock:** Only one AI response can be generated at a time. Concurrent requests wait in a queue. The lock is now hardened so the server can never get permanently stuck even if an error occurs mid-generation.
- **Persona:** The AI's personality, jurisdiction, formatting rules, and response modes are defined in `response_styles/response_style.prompt.md` at the root of the project.

---

## RAG — Retrieval-Augmented Generation

When a user uploads a document or asks a question, the system doesn't just pass it raw to the AI. It uses a **RAG pipeline** to intelligently retrieve the most relevant information first.

**How it works, step by step:**

1. **Chunking & Thread Memory** — Uploaded documents are split into overlapping paragraphs of approximately 600 characters each, with 100-character overlaps to preserve context at boundaries. Each document is also stored in a thread-scoped memory store tied to the conversation ID, so follow-up messages can reference previously uploaded files without re-uploading them.

2. **Embedding** — Each chunk is converted into a 384-dimensional numerical vector (an "embedding") using a local embedding model (`all-MiniLM-L6-v2` by Xenova, approximately 22 MB, downloaded automatically on first use). This vector mathematically represents the chunk's meaning.

3. **Deduplication** — Each chunk is hashed with SHA-256. If an identical chunk was uploaded before, its embedding is retrieved from SQLite cache instead of being recomputed.

4. **Vector Index** — All chunk embeddings are stored in an HNSW (Hierarchical Navigable Small World) vector index on disk. This allows extremely fast "find me the most semantically similar chunks" queries.

5. **Retrieval** — When a user sends a message, the question itself is embedded and the vector index is searched for the top 5 most relevant document chunks. Chunks from other conversations are excluded (thread isolation), and chunks scoring below 0.20 cosine similarity are discarded. Casual queries (greetings, short inputs without SK-domain keywords) skip the vector search entirely via a semantic gatekeeper.

6. **Context injection** — Relevant chunks are inserted into the AI’s prompt as labeled passages. The AI is instructed to base its answer on these passages. If no chunks meet the similarity threshold but the thread has previously uploaded documents, the full document text is re-injected directly as a fallback, ensuring the AI never loses access to uploaded content.

7. **Event injection** — If the question appears to be about SK events or programs, live data from the SQLite events database is also injected into the prompt as authoritative context.

The result is that the AI answers based on actual document content rather than hallucinating, while remaining fully offline.

---

## Response Modes

The AI classifies every incoming message into one of three modes before responding:

| Mode | When It Triggers | What the AI Does |
|------|-----------------|------------------|
| **Mode A — Casual** | Greetings, small talk, single-word inputs | Short friendly reply, no formal structure |
| **Mode B — Professional** | SK services, events, budgets, legal questions | Formal Summary/Steps/Contacts structure |
| **Mode C — Document Analysis** | User uploads a document and asks about it | Brief acknowledgment only — no unprompted summary |

In addition, a **Document Drafting Rule** applies at all points in the conversation regardless of mode:

- Triggered when the user asks to create, draft, write, or compose any document, letter, resolution, certificate, report, or official record
- The AI writes 1-2 conversational intro sentences, then immediately outputs the full document wrapped in `<official_document>` tags
- If the user asks a question AND requests a document in the same message, the AI answers the question first in plain text, then outputs the document in tags
- The AI is prohibited from creating fake download links — the export buttons appear automatically when it uses the correct tags

---

## How to Start

**Option A — Manual (3 terminals):**
1. Python AI Layer: `cd ai-layer && python -m uvicorn main:app --host 0.0.0.0 --port 8000`
2. Node.js Backend: `cd backend && node server.js`
3. Frontend: `cd frontend && npm run dev`

**Option B — One-click:**
Run `start_system.bat` (starts all 3 services). To stop: run `stop_system.bat`.

## Smart Document Export

When the AI drafts an official SK document (via the Document Drafting Rule), it wraps the document content in special `<official_document>` tags. The frontend detects these tags and automatically renders two export buttons below the AI's reply:

- **Export as DOCX** — downloads a Word document formatted with SK Barangay Concepcion Dos letterhead
- **Export as PDF** — downloads a PDF with the same SK letterhead

The exported files include the official header:
> Republic of the Philippines → City of Marikina → Barangay Concepcion Dos → Office of the Sangguniang Kabataan

The document content shown inside the export panel is cleanly separated from the AI's conversational reply so only professional text appears in the exported file.

---

## Navigation Modules

The left sidebar contains a navigation bar at the bottom with three module buttons:

| Module | Icon | Status |
|--------|------|--------|
| AI Assistant | 💬 | Fully active — the main chat interface |
| Events & Attendance | 📅 | Active — analytics charts + event management (CRUD) |
| Official Reports | 🗂️ | Active — template-based document generation (Resolution, Minutes, Certificate) |

Clicking a module button switches the main content area. The active module is highlighted with a blue dot indicator.

---

## Document Upload

- Supports PDF, DOCX, TXT, Markdown, and CSV files
- Up to 5 files per message (configurable)
- Per-file size limit: 10 MB by default (configurable)
- File type validation is enforced on both MIME type and file extension
- Extracted text is stored in the browser's localStorage so it persists across chat turns without re-uploading

---

## SK Events Database

The backend maintains a local SQLite database of SK programs and events. It comes pre-seeded with 8 real SK Concepcion Dos events covering categories like sports, scholarships, seminars, livelihood programs, fun runs, cultural events, health programs, and more.

Each event record stores 15 fields: title, description, category, date, **time**, location, organizer, status, requirements, contact, **attendees**, **male_count**, **female_count**, **staff_count** (optional), and **budget_allotted**.

The AI automatically detects when a user's question is about events and injects the relevant event records directly into its prompt (including attendance counts, gender breakdown, staff, and budget data), ensuring accurate and up-to-date answers without relying on its training data.

Events can be managed via the REST API (create, update, delete). Documents can be uploaded to automatically extract event fields via keyword scanning with optional Qwen AI fallback for low-confidence fields.

---

## Real-Time Streaming

The AI response is not delivered all at once. Instead, it is streamed token-by-token to the browser as it is being generated. The UI displays each phase with visual feedback:

| Phase | What's Happening | UI Indicator |
|-------|-----------------|-------------|
| Indexing Documents | Uploaded files are being chunked and embedded | Spinning ring + "Indexing Documents..." |
| Searching Knowledge Base | Vector index is being queried for relevant chunks | Spinning ring + "Searching Knowledge Base..." |
| Generating | The AI model is producing a response | Live text appearing with blinking cursor |
| System Online | Idle, ready for input | Status badge in header |

---

## Security Measures

- All network origins are whitelisted — the backend only accepts requests from known browser origins
- File uploads are validated by both MIME type and file extension before processing
- Rate limiting: maximum 60 requests per minute per IP address
- All configuration (ports, limits, origins) lives in environment variables, never hardcoded
- The system is designed for local single-user use — no authentication system is in place

---

## Conversation Management

- The browser (localStorage) is the source of truth for all chat history
- Each conversation is a "thread" with a unique ID
- Threads can be pinned, renamed, or deleted
- The backend only stores lightweight metadata (title, pin state) in memory; it does not persist message history
- Thread title is automatically set from the first message in the conversation

---

## Backend API Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Health check — always returns OK |
| GET | `/ready` | Returns ready when AI model has finished loading |
| POST | `/api/chat` | Non-streaming chat (legacy, returns full JSON response) |
| POST | `/api/chat/stream` | Streaming chat — primary endpoint used by the UI |
| GET | `/api/events` | List SK events (filterable by status and category) |
| POST | `/api/events` | Add a new SK event |
| PATCH | `/api/events/:id` | Update an existing event |
| DELETE | `/api/events/:id` | Remove an event |
| POST | `/api/events/parse-document` | Extract event fields from uploaded document (keyword + AI fallback) |
| POST | `/api/export/document` | Generate a SK letterhead DOCX or PDF from AI-drafted content |
| POST | `/conversations` | Create or update a conversation record |
| PATCH | `/conversations/:id/rename` | Rename a conversation |
| PATCH | `/conversations/:id/pin` | Pin or unpin a conversation |
| DELETE | `/conversations/:id` | Delete a conversation record |

---

## Configuration Variables (`backend/.env`)

| Variable | Default | What It Controls |
|----------|---------|-----------------|
| `PORT` | `3001` | Which port the backend listens on |
| `CORS_ORIGINS` | `http://localhost:5174` | Browser origins allowed to connect |
| `MAX_FILE_SIZE_MB` | `10` | Maximum size per uploaded file |
| `MAX_FILES` | `5` | Maximum number of files per message |
| `TOP_K` | `5` | How many document chunks to retrieve per query |
| `VECTOR_STORE_DIR` | `data` | Folder where the vector index files are saved |
| `GRAMMAR_ENFORCEMENT` | `false` | Enables an optional second AI pass to fix grammar |

---

## Key Files at a Glance

| File | What It Does |
|------|-------------|
| `backend/server.js` | The entire backend: AI init, RAG pipeline, streaming endpoint, events database (15 columns), conversation endpoints, document export, document parser proxy |
| `backend/.env` | All runtime configuration values |
| `backend/data/events.db` | SQLite database (SK events with attendance/budget + embedding cache) |
| `backend/data/hnsw.index` | The persistent vector index (HNSW graph, binary) |
| `backend/data/hnsw-meta.json` | Metadata for the vector index (chunk text, filenames, hash map) |
| `frontend/src/App.jsx` | The entire React frontend: chat UI, SSE consumer, thread sidebar, file upload, sources panel, export panel, sidebar module nav |
| `ai-layer/main.py` | Python AI service: NLP endpoints (intent, summarize, embed, OCR, doc gen, analytics, document parser) |
| `response_styles/response_style.prompt.md` | The AI's system prompt — personality, rules, jurisdiction, and all response modes A/B/C/D/M (root of project) |
| `Qwen25GGUF/Qwen2.5-7B-Instruct-Q4_K_M.gguf` | The AI model weights file (not committed to Git, ~4.7 GB) |
| `start_system.bat` | One-click launcher for all 3 services |
| `stop_system.bat` | One-click shutdown for all 3 services |

---

## Technology Stack

**Backend (Node.js)**
- Node.js with Express — web server
- node-llama-cpp — local AI model inference (Qwen 2.5 7B)
- @xenova/transformers — local embedding model
- hnswlib-node — fast vector similarity search
- better-sqlite3 — events database (15 columns) and embedding cache
- pdf-parse, mammoth — document text extraction
- multer — file upload handling
- express-rate-limit — request rate limiting
- dotenv — environment configuration
- docx — Word document generation (export feature)
- pdfkit — PDF generation (export feature)
- axios, form-data — HTTP client for Python AI Layer communication

**Python AI Layer**
- FastAPI + Uvicorn — async API server
- transformers — intent classification (bart-large-mnli) + summarization (distilbart-cnn-12-6)
- sentence-transformers — text embeddings (all-MiniLM-L6-v2)
- pytesseract + Pillow — OCR for images
- pdf2image + Poppler — PDF OCR
- python-docx — DOCX text extraction + document generation
- reportlab — PDF document generation with page borders
- Jinja2 — document templates
- pandas + plotly — events analytics (pie, bar, grouped bar charts)

**Frontend**
- React 18 — UI framework
- Vite 5 — build tool and dev server
- Tailwind CSS v4 — styling
- react-markdown — renders AI responses as formatted text
- react-plotly.js — interactive analytics charts

---

## Known Limitations

- **GPU memory**: The context window now tries 8192 tokens and falls back down to 4096 → 2048 → 1024 automatically. Very long conversations may still lose earlier context on lower-end GPUs.
- **One response at a time**: The AI can only generate one response at a time. Multiple simultaneous users must wait in a queue.
- **No user accounts**: There is no login system. Designed for trusted local use only.
- **Markdown rendering**: AI responses render without sanitization — a low risk in a local-only environment but worth noting.
- **Backend URL hardcoded**: The frontend connects to `http://localhost:3001` directly in the source code rather than via an environment variable.
- **Model instruction-following**: The 7B parameter model handles complex multi-instruction tasks well, but very complex multi-part prompts may still occasionally produce imperfect output.
- **No automated tests**: No unit, integration, or end-to-end test suite exists yet.
- **Platform-specific build**: The AI inference library requires a native binary compiled for your specific OS/hardware. Docker is not supported yet.

---

## Recommended Improvements (Next Phase)

- Move the hardcoded backend URL to a frontend environment variable
- Add XSS sanitization to AI response rendering
- Add per-document toggle controls in the UI (include/exclude individual files from retrieval)
- Add monitoring metrics endpoint
- Add automated backend and frontend tests
- Add Docker support for easier deployment
- Add a CI/CD pipeline for automated lint and tests
- Add a model download script with checksum verification
