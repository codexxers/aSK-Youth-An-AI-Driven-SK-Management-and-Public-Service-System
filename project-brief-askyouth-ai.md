# Project brief: aSK//YOUTH.AI (Qwen 2.5 7B + Vector RAG)

**One-line pitch:** Privacy-first, fully local AI assistant for barangay SK (youth council) work—chat, document Q&A with vector retrieval, events and attendance analytics, and SK-branded document export—no cloud inference required.

**Use this file for:** Handoff to Claude or other assistants; LinkedIn post draft facts; portfolio descriptions.

---

## What it is (and what it is not)

| Aspect | Description |
|--------|-------------|
| **Product name** | aSK//YOUTH.AI |
| **Type** | Local-first **web application** (React + Vite + Tailwind). Three processes: Node backend, Python AI layer, browser UI. |
| **PWA?** | **Not shipped as a PWA** in this repo (no `manifest.webmanifest` / service worker for install-offline shell). Runs in browser against `localhost`; stack is suitable for a future PWA layer if you add manifest + SW. |
| **Primary model** | Qwen 2.5-7B-Instruct (GGUF Q4_K_M, ~4.7 GB) via **node-llama-cpp** on the Node backend. |
| **Domain** | Built for **Barangay Concepcion Dos SK** (Marikina, Philippines)—persona, prompts, and exports reflect that jurisdiction. |

---

## Problem it solves

SK officers need answers grounded in **their own PDFs/DOCX**, quick **official drafts** (resolutions, minutes, certificates), and **event/attendance visibility**—without sending sensitive barangay data to third-party APIs. This system keeps inference and embeddings **on-machine** (after initial model downloads).

---

## Architecture (high level)

1. **Frontend (Vite + React, port 5174)** — Chat with SSE streaming, threads (pin/rename/delete), file upload (incl. paste images), markdown rendering, Plotly analytics, DOCX/PDF export UI when the model uses `<official_document>` tags.
2. **Backend (Express + Node, port 3001)** — Loads Qwen; RAG (chunk → embed → HNSW index → top-k retrieval); SQLite for SK events + embedding cache; rate limiting and CORS; proxies some work to Python.
3. **Python AI layer (FastAPI + Uvicorn, port 8000)** — CPU-side NLP: intent, summarization, embeddings (sentence-transformers), OCR (Tesseract/Poppler), template docs, events analytics (pandas/plotly), document field parsing.

**Data flow:** Browser → SSE to Node → (optional) Python for NLP/RAG helpers → streamed tokens back. Thread-scoped RAG; events injected when queries look event-related.

---

## Notable technical features

- **RAG:** Overlapping chunks (~600 chars), SHA-256 dedup cache, **hnswlib-node** on-disk index, **Xenova/all-MiniLM-L6-v2** (and/or Python) embeddings, similarity threshold + semantic gatekeeper for casual queries.
- **Streaming UX:** Phases shown in UI (indexing, vector search, generating).
- **Response modes:** Casual vs professional SK tone vs document-analysis behavior; centralized system prompt in `response_styles/response_style.prompt.md`.
- **SK events DB:** SQLite with seeded programs; CRUD + document-assisted field extraction; attendance and budget fields for analytics.
- **Security posture:** CORS allowlist, upload validation, rate limits—designed for **trusted local/single-user** use (no auth in scope).

---

## Stack (summary)

| Layer | Key dependencies |
|-------|-------------------|
| Node | Express, node-llama-cpp, @xenova/transformers, hnswlib-node, better-sqlite3, pdf-parse, mammoth, docx, pdfkit, multer, axios |
| Python | FastAPI, uvicorn, transformers, sentence-transformers, pytesseract, pdf2image, python-docx, reportlab, Jinja2, pandas, plotly |
| Frontend | React 18, Vite 5, Tailwind CSS v4, react-markdown, react-plotly.js |

---

## How to run (developer)

- **One command (Windows):** `start_system.bat` (starts Python layer, Node, Vite per project scripts).
- **Manual:** `ai-layer` → `uvicorn main:app --host 0.0.0.0 --port 8000`; `backend` → `node server.js`; `frontend` → `npm run dev`.
- **Model file:** Place Qwen GGUF under `Qwen25GGUF/` (not in Git; large binary).

---

## Honest limitations (good for LinkedIn “what I learned”)

- Single concurrent generation lock; multi-user queue, not horizontal scale-out.
- Frontend backend URL historically hardcoded to `localhost:3001` (env improvement noted in internal docs).
- Native **node-llama-cpp** binaries are platform-specific; Docker story not primary path yet.
- No automated test suite called out in internal overview.

---

## LinkedIn angles (pick one tone)

- **Impact:** “Offline AI copilot for local government youth programs—RAG over their documents, not generic web answers.”
- **Engineering:** “Tri-service architecture: Node for GGUF inference + vector DB, FastAPI for CPU NLP/OCR, React SSE for token streaming.”
- **Trust:** “Designed so barangay operational data stays on the workstation.”

---

## Repo / workspace naming

This workspace is the **Qwen 2.5 7B + VectorDB** variant of a broader **aSKYOUTH / Tailwind** multi-model experiment family; behavior and docs align with `System Overviews/system_overview_simplified.md` in this tree.

---

*Generated for external sharing. Technical source of truth: `System Overviews/system_overview_simplified.md` and code under `backend/`, `frontend/src/`, `ai-layer/`.*
