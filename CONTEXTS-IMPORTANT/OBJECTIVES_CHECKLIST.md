# aSK Youth — Objectives & Scope Checklist

**Date:** 2026-05-16  
**Environment (production):** Vercel UI + GitHub → Cloudflare Tunnel → inference PC (not localhost)  
**Code scan + upgrade pass:** AI_EXECUTION_PROMPT (response v3.2, llm_config 32k, Python PM2 tools)

Legend: ✅ Attained | 🟡 Partial | ❌ Not in codebase | ➖ N/A (thesis evaluation only)

---

## General objective

| Item | Status | Evidence |
|------|--------|----------|
| Web-based admin framework + AI for SK Concepcion Dos | ✅ | React SPA (`askyouth-web-only/`), Express + Qwen, SQLite, Vercel + tunnel deploy |

---

## Specific objectives (1–5)

### Objective 1 — Automate SK compliance documents & project resolutions

| Criterion | Status | Notes |
|-----------|--------|-------|
| Template DOCX/PDF (Resolution, Minutes, Certificate) | ✅ | `ReportsModule`, `POST /api/generate-document` |
| AI-drafted official docs from chat | ✅ | `<official_document>` + `POST /api/export/document` |
| Python `document_generator` tool (v3 upgrade) | 🟡 | Wired via `tool_router` when PM2 services online |
| Full DILG compliance workflow automation | ❌ | Human review + templates; not all forms automated |

**Obj 1 overall:** 🟡 **~75%**

---

### Objective 2 — AI budget estimation (historical + RA 10742)

| Criterion | Status | Notes |
|-----------|--------|-------|
| RA 10742 in system prompt | ✅ | `response_style.prompt.md` v3.2 |
| Historical spend in SQLite (`budget_allotted`) | ✅ | Events DB + admin charts |
| Chat budget guidance from event context | ✅ | `buildRagContext` + event injection |
| Python `budget_estimator` microservice | 🟡 | Present in PYDIR; needs PM2 + tool call from model |
| Dedicated budget estimator UI / imbalance alerts | ❌ | Not a standalone module yet |

**Obj 2 overall:** 🟡 **~50%** (up from ~45% if PM2 tools running)

---

### Objective 3 — Digital records & participation tracking

| Criterion | Status | Notes |
|-----------|--------|-------|
| Centralized SQLite event records | ✅ | `events` table, CRUD, analytics |
| Aggregate attendance (M/F/staff/total) | ✅ | Event form + charts |
| Python `attendance_exporter` | 🟡 | PM2 + router when enabled |
| Per-youth registration database | ❌ | Not built |
| QR / digital check-in verification | ❌ | Study scope mentions verification; impl = manual totals only |

**Obj 3 overall:** 🟡 **~30%**

---

### Objective 4 — AI-powered chatbot

| Criterion | Status | Notes |
|-----------|--------|-------|
| Streaming chat SSE | ✅ | `POST /api/chat/stream` |
| RAG over uploads (HNSW) | ✅ | Vector store + thread memory |
| SK persona + role gates (v3.2) | ✅ | Prompt + JWT `resolveActiveRole` |
| Runtime PH timestamp injection | ✅ | `timestamp_util.js` + `buildRuntimeInjection` |
| Context window 32768 | ✅ | `backend/llm_config.js` (after upgrade) |
| Context compression before LLM | 🟡 | `context_manager` when PM2 online |
| Grammar post-pass | 🟡 | `language_corrector` when PM2 online |
| Tool routing (`<TOOL>` payloads) | 🟡 | `tool_router` + `postProcessAIResponse` |

**Obj 4 overall:** ✅ **~95%** (core); tools 🟡 until PM2 verified

---

### Objective 5 — ISO/IEC 25010 evaluation

| Criterion | Status | Notes |
|-----------|--------|-------|
| In-app ISO module | ➖ | Thesis Ch. 4–5 — not software feature |
| Test plan / surveys | ➖ | External to repo |

**Obj 5 overall:** ➖ **N/A in code**

---

## Scope (in scope)

| Scope bullet | Status |
|--------------|--------|
| Automate admin records/reports | 🟡 |
| Localized data + RA 10742 budget AI | 🟡 |
| Digital verification (registration/attendance) | 🟡 (aggregates only) |
| React + Node + Python + LLM + mobile web | ✅ |
| AI chatbot for SK comms | ✅ |

---

## Limitations (must stay out)

| Limitation | Honored? |
|------------|----------|
| Barangay Concepcion Dos only | ✅ prompt + seeds |
| No other LGU integration | ✅ |
| No biometric / multi-language / live video | ✅ prompt refuses |
| No 100% AI accuracy guarantee | ✅ disclaimers in prompt |
| Internet + inference PC for hosted AI | ✅ Vercel + tunnel model |
| GPU ≥6 GB VRAM for local Qwen | ✅ Q4_K_M + llm_config |

---

## AI upgrade implementation (this session)

| Step | Status | Artifact |
|------|--------|----------|
| 1 Response style v3.2 | ✅ | `response_styles/response_style.prompt.md` (715 lines); loader supports markers or full file |
| 2 llm_config + timestamp_util | ✅ | `backend/llm_config.js`, `backend/timestamp_util.js`; `initLlama` uses 32768 ctx |
| 3 Python PM2 services | 🟡 | `pm2.ecosystem.config.cjs`, `.env.example`, `generated_docs/` — **run PM2 on PC** |
| 4 server.js tool pipeline | ✅ | `ROUTER_URL`, `CONTEXT_URL`, `LANGUAGE_URL`, `postProcessAIResponse` |
| 5 Verify | 🟡 | Run checklist in `AI_EXECUTION_PROMPT.md` on inference PC |

---

## Professor Phase 6 (extra)

| Phase | Status |
|-------|--------|
| 6-A Auth | ✅ |
| 6-B SK patterns (`fiscal_year`, `sk_program`) | ❌ |
| 6-C Yearly heatmap | ❌ |
| 6-D Suggestions UI | 🟡 API only |
| 6-E Admin dashboard | ✅ |
| 6-F Mobile | 🟡 mostly |

---

## What to run on inference PC (verification)

```powershell
cd "E:\Programmings\htdocs\Tailwind aSKYOUTH - 3 AI Models\Tailwind aSKYOUTH - VectorDB - 3. Qwen2.5-7B-Instruct\backend"
node timestamp_util.js

cd "..\PYTHON PROGRAMS TO ADD & CONFIG TO IMPLEMENT"
copy .env.example .env
# edit DB_PASS
pip install flask python-docx reportlab psycopg2-binary tiktoken pytz qrcode pillow deep-translator requests language-tool-python sumy nltk
python -m nltk.downloader punkt stopwords
pm2 start pm2.ecosystem.config.cjs
pm2 list

# restart Node backend + tunnel; test chat prompts from AI_EXECUTION_PROMPT.md
```

---

*Pair with `SYSTEM_CONTEXT.md` §0 and §7 for agent handoff.*

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
