# System requirements — aSK//YOUTH.AI

This chapter describes what beneficiaries need to **use** the system versus what is required on the **machine that runs the AI backend**. End users open the web application at a **public HTTPS URL** on a **custom domain** purchased from a **domain registrar** and connected to **Vercel** for the user interface, with **DNS** (commonly **Cloudflare**) configured for both the **website** and a separate **API hostname** served via **tunnel**. The **API and models** run on a designated PC (**beneficiary workstation** or **SK-funded equipment**) reached through **Cloudflare Tunnel** from that PC to the public internet. No end user installs the monorepo or runs a local Vite server for normal operation.

The repository contains two web client trees: **`askyouth-web-only/`** is the **source deployed to Vercel**; **`frontend/`** is an additional full client used in local monorepo development. Both can carry their own `node_modules` and build artifacts, so a **single developer clone** can look much larger on disk than the **minimum footprint needed on the inference PC** (which only needs `backend/`, `ai-layer/`, model assets, scripts, and configuration—not duplicate full frontends for production).

---

## Operating System Requirements

- **End-user client (browser):** Any common desktop or mobile OS that supports a current web browser (e.g. **Windows 10 or 11**, **macOS**, **Android 10+**, **iOS / iPadOS** current releases).

- **Inference and API host (beneficiary or SK-funded PC):** **64-bit Windows 10 or 11** is the primary reference environment for this project’s launcher scripts and paths; **64-bit Linux** is viable for teams comfortable running **Node.js**, **Python**, and **cloudflared** manually with equivalent paths and services.

- **Public frontend (Vercel):** The **built React application** (static files after `vite build`) runs on **Vercel’s managed hosting**—not on the student’s laptop or on the inference PC. Viewing the site only requires a **browser**; nobody needs to install **Apache**, **IIS**, **nginx**, or another web server on their own machine **to serve the interface**. (Operating system updates for Vercel’s infrastructure are handled by **Vercel**.)

---

## Special Software Requirements

- **End-user client:** A **modern web browser** (**Google Chrome**, **Microsoft Edge**, **Mozilla Firefox**, or **Apple Safari**, current stable channel) with JavaScript enabled, support for **`fetch`** and readable streams for chat, and optional **PDF viewing** for exported documents or reports where the application provides downloads.

- **Inference and API host:** **Node.js** (LTS recommended) for the **Express** backend and **node-llama-cpp**; **Python 3** with **FastAPI** / **Uvicorn** for the companion **AI layer** on port **8000**; **NVIDIA GPU drivers** and a **CUDA-capable** stack for **GGUF** inference on GPU; **Cloudflare Tunnel** connector (**cloudflared**) with tunnel token or credentials so **`https://` API hostnames** forward to **localhost:3001**; optional **Tesseract** / image tooling where OCR features are enabled. Embedded **SQLite** (via **better-sqlite3**) satisfies persistence—no separate MySQL or PostgreSQL server is required for this codebase.

- **Cloud services:** **Vercel** account and project for building and hosting the **Vite + React** client from **`askyouth-web-only`**. At build time, **`VITE_BACKEND_URL`** must equal the **public API origin** only: **`https://`** plus the **API hostname** Cloudflare exposes to the internet (no path segment), e.g. **`https://api.<your-registered-domain>`**, matching the tunnel’s public hostname so the deployed SPA can request **`/health`** and **`/api/...`** on that API host over HTTPS (**cross-origin**; the backend **CORS** configuration must list the UI’s **`https://`** origin). A **custom domain** from a **registrar** (recurring fee) is linked in **Vercel** for the SPA; **DNS** at **Cloudflare** (or the registrar) points the apex and **`www`** to Vercel and defines the **API subdomain** used by the tunnel, with optional **Zero Trust / Access** on the API hostname.

---

## Hardware and Cloud Specifications

Hardware requirements distinguish **lightweight clients** that only render the hosted UI from the **inference PC** that must sustain the model, vector store, and tunnel.

- **End-user client:** **Dual-core** (or better) processor, **4 GB RAM** minimum (**8 GB** recommended for smooth operation with charts and long threads), stable **Wi-Fi or Ethernet**, and a display suitable for reading and typing; tablets and phones should meet their OS vendor’s minimums for current browsers.

- **Public frontend (Vercel):** Performance and global delivery are provided by **Vercel’s edge network**; no beneficiary hardware is consumed for hosting static assets.

- **Inference and API host (beneficiary or SK-funded PC):** **x86-64** CPU with **eight physical cores or sixteen threads** (or equivalent) recommended so **Node**, **Python** (transformers / PyTorch on CPU per project design), and OS stay responsive; **32 GB system RAM** recommended for concurrent services and headroom; **NVMe or SSD** with **tens of gigabytes free** for application files, dependencies, **GGUF** weights (multi‑GB for **Qwen 2.5 7B** quantized), embedding caches, and SQLite plus vector data—exact size depends on installed models and retention, not on whether a developer machine keeps duplicate frontend copies.

- **GPU (inference host):** **NVIDIA** discrete GPU with **CUDA** support and **minimum 8 GB VRAM** for the intended **Qwen 2.5 7B Instruct** path in this stack; **AMD or Intel-only** GPUs do not satisfy the current **CUDA** inference configuration without changing the stack. A **reference-class** workstation similar to **AMD Ryzen 7 7700**, **32 GB DDR5**, and **NVIDIA GeForce RTX 4060 Ti 8 GB** illustrates a configuration that meets the **8 GB VRAM** floor; larger context or future models may warrant more VRAM.

- **Network (inference host):** **Broadband** with **at least ~10 Mbps upload and ~10 Mbps download** recommended so **Cloudflare Tunnel** stays stable, health checks succeed, and document uploads complete without timeouts.

---

*Deployment model: **custom domain** (registrar) → **Vercel** (static frontend) + **Cloudflare** (DNS / **Tunnel** to **Express** on the inference PC) + **FastAPI** AI layer + **SQLite** on the inference PC.*
