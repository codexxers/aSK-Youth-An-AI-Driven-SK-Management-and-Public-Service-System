# AI//SYNC Web App - System Operations Guide

This document is intended for AI assistants (such as GPT-5 Mini) to understand the architecture and standard operating procedures for the AI//SYNC web application.

## 1. Project Overview

AI//SYNC is a 3-tier system featuring a modern UI, a Node/Express middleware backend, and native AI integration.

### Core Architecture:
- **Frontend** (`/frontend`): A beautifully designed React + Vite application featuring Tailwind CSS and standard Web APIs. Runs on port `5173`.
- **Backend / Interstitial Layer** (`/backend`): A Node.js and Express server that binds directly to the local model via `node-llama-cpp` falling back safely to CPU or Vulkan. Runs on port `3000`.
- **AI Neural Process** (`/ai-layer`): Legacy Python layer/experiments with FastAPI. (Secondary to functionality, Node.js backend operates independently but good to maintain context).

## 2. Standard Activation Protocol

To correctly boot the entirety of the application for the user, open split terminals and execute the following stack processes simultaneously.

### Step 2a: Start the Node Backend
1. **Navigate**: `cd backend`
2. **Execute**: `npm start`
3. **Verify**: Ensure the backend confirms the native Llama engine model load success and the server starts on `http://localhost:3000`.

### Step 2b: Start the Frontend UI
1. **Navigate**: `cd frontend`
2. **Execute**: `npm run dev` (If utilizing an interactive terminal in Windows, it may be safer to redirect stdin by running: `$null | npm run dev`)
3. **Verify**: Ensure Vite confirms it is listening on `http://localhost:5173`.

## 3. Operational Rules

1. Avoid running `npm install` unless a dependency is completely broken; `node_modules` caches are highly stable.
2. If modifying the Llama native module in `server.js`, respect the existing fallback implementations (`CUDA` -> `vulkan` -> `CPU`).
3. Always verify that `frontend/src/App.jsx` handles Axios POSTs to `http://localhost:3000/api/chat`.
