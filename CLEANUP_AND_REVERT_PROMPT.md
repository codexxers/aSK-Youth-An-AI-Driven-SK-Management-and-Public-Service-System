# aSK Youth — Cleanup & Revert Prompt
# Paste to Claude Code, Cursor, or any coding AI.

---

## WHAT THIS PROMPT DOES

1. Reverts the LLM config to GPU-only, 8192 context (removes the failed RAM extension)
2. Renames and replaces the response style file
3. Moves Python tools from the long-named folder into backend/tools/
4. Cleans up leftover files in the project root

All replacement files are already prepared in this same folder.
Do NOT modify the Python tool files themselves — only move them.

---

## PATHS

```
[ROOT] = E:\Programmings\htdocs\Tailwind aSKYOUTH - 3 AI Models\Tailwind aSKYOUTH - VectorDB - 3. Qwen2.5-7B-Instruct\
[PYDIR] = [ROOT]\PYTHON PROGRAMS TO ADD & CONFIG TO IMPLEMENT\
[BACKEND] = [ROOT]\backend\
[RESPONSE_STYLES] = [ROOT]\response_styles\
```

---

## TASK 1 — Revert LLM config to GPU-only, 8192 context

Source: the new `llm_config.mjs` in this folder (the one you are reading this prompt from).

Steps:
1. Copy the new `llm_config.mjs` to `[BACKEND]\llm_config.mjs`, replacing the existing file.
2. Open `[BACKEND]\server.js` and find the import line for llm_config:
   ```js
   import { ... } from './llm_config.mjs';
   ```
   Update the destructured imports to match the new export names:
   ```js
   import { initModelAndContext, checkMemoryHealth } from './llm_config.mjs';
   ```
3. Find where the model and context are initialized. Replace with:
   ```js
   const { model, ctx, contextSize, gpuLayers } = await initModelAndContext();
   ```
4. Find the context_manager call in the chat handler and update context_size to use the actual value:
   ```js
   context_size: contextSize,   // was hardcoded 32768 — now uses actual loaded size
   ```
5. Remove any remaining references to `createContextWithFallback` or the old
   32k/16k/RAM-extension config. Search for: 32768, 16384, kvCacheQuantizationType, useMlock
   and remove or replace with the values now defined inside llm_config.mjs.
6. In `[BACKEND]\.env`, remove or comment out these lines if they exist:
   ```
   LLM_GPU_LAYERS=20
   LLM_GPU_LAYERS=24
   ```
   The default in the new config is 32 (full GPU). Only set LLM_GPU_LAYERS in .env
   if the server logs a VRAM OOM error on startup.

Verify: start the server. Expected log lines:
```
[LLM] Loading model — GPU layers: 32 ...
[LLM] ✓ Model loaded — GPU layers: 32
[LLM] Creating context — size: 8192 tokens
[LLM] ✓ Context ready — 8192 tokens
```
If it shows GPU layers 28, 24, or 20 instead of 32, the model loaded on fallback — that is
expected and fine, it means VRAM is slightly constrained. Context at 8192 is what matters.

---

## TASK 2 — Replace the response style file

The response style file has two issues to fix:
1. It was renamed `response_style.prompt.md` — it should be `response_style.md`
2. The content needs to be replaced with the new version

Steps:
1. In `[RESPONSE_STYLES]\`, check what the current file is named.
   It may be one of:
   - `response_style.prompt.md`
   - `response_style.md`
2. Copy the new `response_style.md` from this folder to `[RESPONSE_STYLES]\response_style.md`.
3. If the old file was named `response_style.prompt.md`, delete it after copying the new one.
   There should be only one file: `response_style.md`.
4. In `[BACKEND]\server.js`, find where the response style is loaded. It likely reads the file
   by path. Update the filename in that path if it was pointing to `response_style.prompt.md`:
   ```js
   // Old (wrong):
   path.join(__dirname, '..', 'response_styles', 'response_style.prompt.md')
   // New (correct):
   path.join(__dirname, '..', 'response_styles', 'response_style.md')
   ```
   Also verify the loader extracts only the SYSTEM_PROMPT_START/END block:
   ```js
   const raw   = fs.readFileSync(promptPath, 'utf8');
   const match = raw.match(/<!-- SYSTEM_PROMPT_START -->([\s\S]*?)<!-- SYSTEM_PROMPT_END -->/);
   const prompt = match ? match[1].trim() : raw;
   ```

Verify: start the server. Log should show:
```
[aSK Youth] System prompt loaded from response_style.md
```

---

## TASK 3 — Move Python tools from long-named folder to backend/tools/

The Python tools are currently in the awkwardly named folder:
```
[PYDIR] = [ROOT]\PYTHON PROGRAMS TO ADD & CONFIG TO IMPLEMENT\
```

Move them into:
```
[BACKEND]\tools\
```

Steps:
1. Create the folder `[BACKEND]\tools\` if it does not exist.

2. Move these files from [PYDIR] to [BACKEND]\tools\:
   ```
   attendance_exporter.py    → [BACKEND]\tools\attendance_exporter.py
   budget_estimator.py       → [BACKEND]\tools\budget_estimator.py
   context_manager.py        → [BACKEND]\tools\context_manager.py
   document_generator.py     → [BACKEND]\tools\document_generator.py
   language_corrector.py     → [BACKEND]\tools\language_corrector.py
   narrative_compiler.py     → [BACKEND]\tools\narrative_compiler.py
   summary_generator.py      → [BACKEND]\tools\summary_generator.py
   timestamp_injector.py     → [BACKEND]\tools\timestamp_injector.py
   tool_router.py            → [BACKEND]\tools\tool_router.py
   ```

3. Move these config/support files from [PYDIR] to [BACKEND]\tools\:
   ```
   .env                      → [BACKEND]\tools\.env
   .env.example              → [BACKEND]\tools\.env.example
   pm2.ecosystem.config.cjs  → [BACKEND]\tools\pm2.ecosystem.config.cjs
   generated_docs\           → [BACKEND]\tools\generated_docs\   (move the whole folder)
   ```

4. Move these JS files from [PYDIR] to [BACKEND]\ (not tools, they belong with server.js):
   ```
   timestamp_util.js         → [BACKEND]\timestamp_util.js  (if not already there)
   llm_config.js             → DELETE (replaced by llm_config.mjs — the .js version is unused)
   ```

5. Move documentation files from [PYDIR] to [ROOT]\docs\ (keep them, just tidy):
   ```
   GPU_RAM_SETUP_GUIDE.md        → [ROOT]\docs\GPU_RAM_SETUP_GUIDE.md
   IMPLEMENTATION_GUIDE(First).md → [ROOT]\docs\IMPLEMENTATION_GUIDE.md
   IMPLEMENTATION_PROMPT(latest).md → DELETE (superseded by AI_EXECUTION_PROMPT)
   ```

6. After moving everything, delete the now-empty [PYDIR] folder:
   ```
   [ROOT]\PYTHON PROGRAMS TO ADD & CONFIG TO IMPLEMENT\  → DELETE (folder should be empty)
   ```

7. Update pm2.ecosystem.config.cjs — it has hardcoded paths to the old folder.
   Open [BACKEND]\tools\pm2.ecosystem.config.cjs and update every script path from:
   ```
   E:\...\PYTHON PROGRAMS TO ADD & CONFIG TO IMPLEMENT\tool_router.py
   ```
   to:
   ```
   E:\...\backend\tools\tool_router.py
   ```
   Do this for all 8 service entries in the ecosystem file.

8. Update the .env file — ASKYOUTH_OUTPUT_DIR path:
   ```env
   ASKYOUTH_OUTPUT_DIR=E:\Programmings\htdocs\Tailwind aSKYOUTH - 3 AI Models\Tailwind aSKYOUTH - VectorDB - 3. Qwen2.5-7B-Instruct\backend\tools\generated_docs
   ```

9. Stop all running PM2 processes and restart from the new location:
   ```powershell
   npx pm2 stop all
   npx pm2 delete all
   cd "[ROOT]\backend\tools"
   npx pm2 start pm2.ecosystem.config.cjs
   npx pm2 save
   ```

Verify:
```powershell
npx pm2 list
# All 8 services show "online"

# Test router still works:
# GET http://localhost:5000/services → shows tool list
```

---

## TASK 4 — Root folder cleanup

The following files/folders in [ROOT] are leftover from the failed RAM extension attempt
or are no longer needed. Delete them:

DELETE these files from [ROOT] if they exist:
```
EMERGENCY_FIX_PROMPT.md        ← superseded, no longer needed
FIX_LLM_CONFIG_PROMPT.md       ← superseded
FIX_VRAM_OOM.md                ← superseded
AI_EXECUTION_PROMPT.md         ← can archive to docs\ or delete
```

KEEP everything else. Do not touch:
```
backend\           scripts\        frontend\       ai-layer\
response_styles\   CONTEXTS-IMPORTANT\   docs\
start.bat          stop.bat        start_system.bat    stop_system.bat
.gitignore         package.json    README.md
```

---

## FINAL VERIFY CHECKLIST

```
[ ] Server starts cleanly — no ABI errors, no UPLINK FAILED
[ ] Log shows: [LLM] ✓ Context ready — 8192 tokens
[ ] Log shows: System prompt loaded from response_style.md
[ ] Sending "Hello" → English reply (not Filipino)
[ ] Sending "Hi magandang gabi" → Filipino reply
[ ] Sending "May I ask what is your SK jurisdiction?" → English reply naming Barangay Concepcion Dos
[ ] Sending "What is SK?" → correct answer: youth council, Sangguniang Kabataan, RA 10742
[ ] Sending "Paano gumawa ng certificate" without details → AI asks for missing info first
[ ] No bracket placeholders ([SK Name], [Date], etc.) in any response
[ ] PM2 list shows 8 services online from backend/tools/
[ ] PYDIR long-named folder is gone from ROOT
[ ] ROOT folder is clean — no leftover fix/implementation MD files
```
