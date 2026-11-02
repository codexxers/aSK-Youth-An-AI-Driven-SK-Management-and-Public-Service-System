# aSK//YOUTH — Deploy guide (simple)

**Live app (frontend):** [https://ask-youth.vercel.app](https://ask-youth.vercel.app)  
**Your domain:** [https://askyouth.online](https://askyouth.online)  
**GitHub:** [https://github.com/codexxers/aSKYouth](https://github.com/codexxers/aSKYouth)

---

## Vercel — where to go (dashboard clicks)

**Open:** [https://vercel.com/dashboard](https://vercel.com/dashboard) → log in.

| Goal | Path |
|------|------|
| **See your site / open app** | Dashboard → click project **`ask-youth`** (or your project name) → top: **Visit** / copy **`.vercel.app`** URL. |
| **Env var `VITE_BACKEND_URL`** | Project **`ask-youth`** → **Settings** (top tab) → left sidebar **Environment Variables** → add **Key** `VITE_BACKEND_URL`, **Value** `https://api.askyouth.online` → check **Production** + **Preview** → **Save**. |
| **Redeploy after env change** | Project → **Deployments** tab → click **⋯** on latest deployment → **Redeploy** (env is baked at build time). |
| **Build settings** (Vite / `dist`) | **Settings** → **General** → scroll to **Build & Development Settings** → Framework **Vite**, Output **dist**, Command `npm run build`. Root Directory **`./`** if `package.json` is repo root. |
| **Connect GitHub / branch** | **Settings** → **Git** → connect repo, production branch **main**. |
| **Add custom domain** (`askyouth.online`) | **Settings** → **Domains** → **Add** → type `askyouth.online` and `www.askyouth.online` → Vercel shows **exact DNS** to put in Cloudflare. |

**First import (if you do it again):** Dashboard → **Add New…** → **Project** → **Import** `codexxers/aSKYouth` → set Framework **Vite**, Build `npm run build`, Output `dist`, add env → **Deploy**.

---

## Cloudflare — where to go (two dashboards)

You use **two** Cloudflare UIs:

| Site | URL | Use for |
|------|-----|---------|
| **Main dashboard** | [https://dash.cloudflare.com](https://dash.cloudflare.com) | Domain **DNS**, **SSL/TLS**, zone **askyouth.online** |
| **Zero Trust** (tunnels + Access) | [https://one.dash.cloudflare.com](https://one.dash.cloudflare.com) | **Tunnels** (`api` → your PC), **Access** (login gate on API) |

### A) DNS records (point names to Vercel or tunnel)

1. [https://dash.cloudflare.com](https://dash.cloudflare.com) → click **`askyouth.online`**.
2. Left sidebar → **DNS** → **Records**.
3. Add/edit rows **exactly** as **Vercel → Domains** tells you (CNAME / A).  
   - Remove old **A/CNAME** that point to registrar “parking” if the apex still shows “Launching Soon”.
4. **Important:** Keep **`api`** subdomain for the **tunnel** only (see B). Do **not** point `api` at Vercel.

### B) Tunnel → your PC backend (`api.askyouth.online` → port 3001)

1. [https://one.dash.cloudflare.com](https://one.dash.cloudflare.com) → left sidebar **Networks** → **Tunnels**.
2. **Create a tunnel** (if none) → name it → **Save tunnel**.
3. **Install connector** on Windows → run the command Cloudflare gives (installs/runs `cloudflared`). Tunnel status should show **Healthy**.
4. Open your tunnel → tab **Public Hostname** (or **Configure** → **Public Hostname**):
   - **Subdomain:** `api`
   - **Domain:** `askyouth.online`
   - **Service:** Type **HTTP**, URL **`http://localhost:3001`**
5. **Save**.

### C) SSL for site on Cloudflare (optional polish)

1. [https://dash.cloudflare.com](https://dash.cloudflare.com) → **`askyouth.online`** → **SSL/TLS** → **Overview**.
2. After DNS points to Vercel correctly, mode **Full (strict)** is usual.

### D) Cloudflare Access (optional — can break SSE/chat)

1. [https://one.dash.cloudflare.com](https://one.dash.cloudflare.com) → **Access** → **Applications**.
2. If you added a **Self-hosted** app for `api.askyouth.online`, browsers must log in before API works — chat may show **Failed to fetch** until you fix policy or use service tokens.
3. **Test without Access first:** remove / disable policy on `api`, confirm chat works, then tighten.

---

## 1. Why the two sites look different

| URL | What it is |
|-----|------------|
| **`ask-youth.vercel.app`** | Real React app from Vercel. |
| **`askyouth.online`** | Shows parking / “Launching Soon” until **Cloudflare DNS** sends traffic to **Vercel** (see **Vercel → Settings → Domains** + **Cloudflare → DNS** above). |

**“Not secure” on apex:** Often old parking page or wrong DNS — fix records + SSL after pointing to Vercel.

---

## 2. Why “UPLINK FAILED / Failed to fetch”

UI on Vercel calls **`https://api.askyouth.online`** (`VITE_BACKEND_URL`). Fails if:

1. PC off or **`start_system.bat`** not running (need **:3001**).
2. **Tunnel** not healthy (**Zero Trust → Networks → Tunnels**).
3. Public hostname not **`api` → `http://localhost:3001`**.
4. **`backend/.env`** `CORS_ORIGINS` missing **exact browser origin** — e.g. **`https://askyouth.online`** / **`https://www.askyouth.online`** / **`https://ask-youth.vercel.app`**. One missing → **`Failed to fetch`** on **`POST /api/chat/stream`** even when **`/health`** works (health uses wide-open CORS).
5. **Express behind tunnel:** `trust proxy` + rate-limit validations (`X-Forwarded-For`, **`Forwarded`** header). Repo enables trust proxy + disables **`Forwarded`** validation noise.
6. **Access** blocking API (see Cloudflare D).

**Checks:** On PC: `http://localhost:3001/health`. Elsewhere: `https://api.askyouth.online/health`.

---

## 3. Make chat work (short checklist)

1. Run **`start_system.bat`** on PC (main project folder — not `askyouth-web-only`).
2. **Zero Trust → Tunnels** → tunnel **Healthy**; **Public hostname** `api` → `http://localhost:3001`.
3. **`backend/.env`:** `CORS_ORIGINS` lists **every UI URL** you open (localhost + Vercel + **`https://askyouth.online`** + **`https://www.askyouth.online`**) → restart backend.
4. **Vercel → Settings → Environment Variables:** `VITE_BACKEND_URL=https://api.askyouth.online` → **Deployments → Redeploy**.

### Auto-start tunnel from `start_system.bat` (main PC folder)

**No** Cloudflare dashboard login each boot. **`cloudflared` process** must run while `api.*` should work; sleep / close window = tunnel down until you run launcher again.

1. **`cloudflared`** on **PATH** (same CLI as tunnel setup).
2. **Zero Trust → Networks → Tunnels** → copy tunnel **name** (not hostname).
3. **Main project root** should have **`cloudflared-tunnel-name.txt`** (line 1 = tunnel name, default **`askyouth`**). Rename if your Zero Trust tunnel differs. Template: **`cloudflared-tunnel-name.example`**.
4. **`start_system.bat`** opens **Cloudflare Tunnel** window: `cloudflared tunnel run <name>`.
5. **`stop_system.bat`** kills **`cloudflared.exe`** too.

Without **`cloudflared-tunnel-name.txt`**, tunnel step **skipped** (local-only).

### Tunnel errors: `cert.pem` vs **`tunnel credentials file not found`**

They are **different** files:

| File | Role |
|------|------|
| **`%USERPROFILE%\.cloudflared\cert.pem`** | Account / origin cert (`tunnel login`). Not enough alone for dashboard tunnels. |
| **`{tunnel-uuid}.json`** | Tunnel secret — usually missing if tunnel was created **only** in Zero Trust UI. |
| **JWT token** | Same tunnel, **remotely-managed** mode — avoids JSON on disk. |

**Recommended fix (dashboard tunnel like `askyouth`):**

1. **Zero Trust** → **Networks** → **Tunnels** → open tunnel → **Configure** / **Install connector** → **Windows**.
2. Copy the install command — token is the long string after `install` / `run` (starts with **`eyJ`**).
3. Project root (next to **`start_system.bat`**): create **`cloudflared-tunnel-token.txt`** with **that token on line 1 only** (no quotes). Template: **`cloudflared-tunnel-token.example.txt`**.
4. **`start_system.bat`** again → **`scripts\run_cloudflare_tunnel.bat`** receives **project ROOT** from launcher and looks for **`cloudflared-tunnel-token.txt`** in **that same folder** (beside **`start_system.bat`**). Fallback: **`%USERPROFILE%\.cloudflared\cloudflared-tunnel-token.txt`**.
5. Tunnel window prints **full path** searched — if it still says **NAME mode**, file missing / wrong name (**not** `cloudflared-tunnel-token.txt.txt`) / first line empty.

Runs **`cloudflared tunnel run --token …`** ([docs — `--token`](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/configure-tunnels/cloudflared-parameters/run-parameters/#token)).

**Never commit** **`cloudflared-tunnel-token.txt`** — listed in root **`.gitignore`**.

**Alternate:** `cert.pem` + **`{uuid}.json`** in **`.cloudflared`** (CLI‑managed tunnel). Optional **`cloudflared-tunnel-id.txt`** line 1 = UUID — script checks JSON exists before **`tunnel run <name>`**.

**Missing origin cert only:** `cloudflared tunnel login` once.

---

## 3b. Env shows in Vercel but chat still “Failed to fetch”

**Redeploy first.** Changing env **does not** update the JS already deployed. **Project → Deployments → ⋯ on latest → Redeploy**. Without this, live site may still use old build (e.g. `localhost:3001`).

**Then open in same browser:** `https://api.askyouth.online/health`  
- Broken → tunnel / PC / hostname — not Vercel.  
- OK → backend reachable; **`/health`** on current `backend/server.js` uses permissive CORS (`origin: true`), so inactive UI is usually **wrong `VITE_BACKEND_URL` in build**, **Access blocking**, or **SSL/DNS** — not `CORS_ORIGINS`. Chat/upload routes still need **`CORS_ORIGINS`** listing every UI origin (`https://ask-youth.vercel.app`, custom apex + `www`).  
- OK + chat fails → **Cloudflare Access** on `api` may block `/api/*`; disable policy briefly to test.

### “Chatbot inactive” but tunnel window looks fine

Order checks:

1. **Filename + folder:** Token must live as **`cloudflared-tunnel-token.txt`** (exact name) on **same disk folder as `start_system.bat`** you actually double-click. **`tunnel token.txt`** / wrong folder = tunnel script ignores it (unless copy exists under `%USERPROFILE%\.cloudflared\`).
2. **Same project clone:** Tunnel window title shows path — token + `start_system.bat` must match **that** tree (`Videos\…` vs `htdocs\…`). Mixing folders = tunnel OK from one copy, dev from another.
3. **Inactive page shows “Health URL”** (after redeploy of latest web): open it in same browser. No JSON → Cloudflare/DNS/tunnel/backend from **internet** broken. JSON OK → deployed bundle still had wrong API host → **Vercel → Settings → Environment Variables → `VITE_BACKEND_URL`** then **Redeploy**.
4. **Dashboard hostname:** Tunnel ingress **`api.…`** must match **`VITE_BACKEND_URL`** (no `http://` on live site — use **`https://api.yourdomain`**).
5. **Cloudflare Zero Trust → Access:** Policy on `api.*` can block anonymous `GET /health`. Pause Access or add bypass for `/health` and API paths you need.
6. ** apex vs www:** If UI is `https://www.…` vs apex, both must work or stick to one; chat CORS must list the exact origin.

**F12 → Console** on inactive page: line **`[aSK health]`** logs URL + status or network error (CORS, blocked, SSL, abort).

**F12 → Network** on Vercel site when you send “hi”: CORS message vs 403 vs `ERR_*` tells which branch.

---

## 4. Vercel settings reference

| Setting | Value |
|---------|--------|
| Framework | **Vite** |
| Root | **`./`** if `package.json` at repo root |
| Build | `npm run build` |
| Output | `dist` |
| Env | `VITE_BACKEND_URL` = `https://api.askyouth.online` — **Production + Preview** |

---

## 5. Optional: `askyouth.online` → same app as Vercel

1. **Vercel** → project → **Settings → Domains** → add `askyouth.online` / `www` → copy DNS instructions.
2. **Cloudflare** → **`askyouth.online`** → **DNS → Records** → apply those records; remove parking records.
3. **Backend CORS** add `https://askyouth.online`, `https://www.askyouth.online`.
4. Keep **`api`** on **Tunnel** only — not on Vercel.

---

## 6. Push to GitHub

Repo: **https://github.com/codexxers/aSKYouth.git** — from folder `askyouth-web-only`:

```bash
git add -A && git status
git commit -m "chore: web update" && git push origin main
```

Never commit `node_modules` / `dist` / `.env`.

---

## 7. What this repo is

Vite + React client only. Model + `backend/` live on main PC folder.

**Offline UI:** If `GET ${VITE_BACKEND_URL}/health` fails (PC off, tunnel down), users see **`ChatbotInactivePage`** (`src/ChatbotInactivePage.jsx`) instead of chat. Poll every **30s** + **Check again** button.

**Agent continuity:** See **[AGENT_HANDOFF.md](./AGENT_HANDOFF.md)** before large refactors.

---

## Cost

Vercel Hobby + Cloudflare free + Tunnel enough for demos; domain renewal at registrar.
