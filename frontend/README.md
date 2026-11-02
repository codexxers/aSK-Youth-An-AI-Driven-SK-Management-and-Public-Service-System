# aSK//YOUTH — web client (Vite + React)

Deploy target: **GitHub + Vercel**. Backend (Qwen, RAG, SQLite) stays on your PC; API exposed via **Cloudflare Tunnel** on **api.askyouth.online**.

- **Deploy, two URLs, “Failed to fetch”, Git push:** see [DEPLOY.md](./DEPLOY.md).
- **Handoff for other agents / IDEs:** see [AGENT_HANDOFF.md](./AGENT_HANDOFF.md).
- **Local API URL:** copy `.env.example` to `.env` and set `VITE_BACKEND_URL` if needed (defaults to `http://localhost:3001`).

```bash
npm ci
npm run dev
```

Upstream repo: https://github.com/codexxers/aSKYouth.git
