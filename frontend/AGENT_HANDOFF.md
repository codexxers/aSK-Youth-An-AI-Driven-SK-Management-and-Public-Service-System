# Handoff: `askyouth-web-only` (official web / GitHub)

Use this file when continuing work in another IDE or with another agent.

## Scope rule (critical)

- **`askyouth-web-only/`** — **only folder** that ships to **GitHub** → **Vercel** for the public UI.
- **Parent monorepo** (`frontend/`, `backend/`, `ai-layer/`, GGUF, etc.) — **local / PC** stack. **Do not** assume changes there are in this repo unless someone copies them.

If a task says “web only,” **edit files under `askyouth-web-only` only.**

## What this repo is

- **Vite + React** chat UI for **aSK//YOUTH.AI**.
- **No** LLM weights, **no** Node/Python backend code here.
- Production API base URL: **`import.meta.env.VITE_BACKEND_URL`** (see `.env.example`). On Vercel this points at **`https://api.askyouth.online`** (or your tunnel URL).

## How the backend is reached

- Real inference + RAG + DB run on the **developer’s PC** (`start_system.bat`: Node **3001**, Python **8000**).
- **Cloudflare Tunnel** exposes **`https://api.<domain>`** → `http://localhost:3001`.
- Browser (Vercel site) → **HTTPS** to tunnel → **PC backend**. If PC/tunnel off, **`GET /health`** fails.

## Chatbot inactive screen

- **`src/ChatbotInactivePage.jsx`** — full-page message when backend unreachable.
- **`App.jsx`** — polls **`${API_BASE}/health`** on load and every **30s**; if fail → inactive page; **“Check again”** triggers immediate recheck.
- Local dev: if backend not running, you’ll see this page (expected).

## Deploy / DNS docs

- **`DEPLOY.md`** — Vercel clicks, Cloudflare DNS + Tunnel, CORS, custom domain, Git push.
- **`README.md`** — short entry + link to `DEPLOY.md`.

## Major updates (expected)

- Treat **`askyouth-web-only`** as the **canonical** frontend for production.
- After big UI changes in the monorepo `frontend/`, **port** the relevant files into **`askyouth-web-only/src/`** (or sync process the team uses) — they are **not** auto-linked.
- Env / tunnel / domain changes: update **`DEPLOY.md`** so the next agent stays aligned.

## Repo URL

- GitHub: **https://github.com/codexxers/aSKYouth**
