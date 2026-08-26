# aSK Youth AI — GPU + RAM Memory Configuration Guide
## Full VRAM Priority with System RAM Extension for 32,768-Token Context

---

## What This Setup Does

Your AI model runs entirely on your GPU. The GPU VRAM holds all the model's weights and does all the computation — nothing is moved to the CPU. When long conversations push the context window beyond what VRAM alone can hold, the **KV cache** (the memory of what's been said in the conversation) quietly overflows into your System RAM. The user sees nothing different — responses are just as accurate, slightly slower on very long sessions.

The result: your GPU runs at full power, your 32GB RAM acts as a smart extension buffer, and your context window expands from 8,192 to 32,768 tokens — four times the conversation memory.

---

## Your Hardware Profile

| Component | Spec | Role |
|---|---|---|
| GPU VRAM | 6 GB | Primary — holds all model weights + KV cache start |
| System RAM | 32 GB | Extension — KV cache overflow as context grows |
| CPU | Your CPU | Assists token batch processing only |
| Target RAM usage | ≤ 16 GB (50%) | Hard ceiling for system stability |

---

## Memory Layout at 32,768 Context

```
GPU VRAM (6 GB total)
├── Model weights Q4_K_M .............. ~4.5 GB  [always here, never moves]
├── KV cache (first portion) .......... ~0.8 GB  [grows as conversation grows]
└── Overhead + buffers ................ ~0.3 GB
─────────────────────────────────────────────────
VRAM used at 32,768 ctx ............... ~5.6 GB ✓ (within 6 GB)

System RAM (32 GB total)
├── KV cache overflow ................. ~2–4 GB  [fills as conversation gets long]
├── Node.js + server process .......... ~1–2 GB
├── OS + background ................... ~3–4 GB
└── Headroom .......................... ~22+ GB
─────────────────────────────────────────────────
RAM used at 32,768 ctx ................ ~6–10 GB ✓ (well under 16 GB ceiling)
```

---

## The Key Settings and Why Each One Matters

### `gpuLayers: 32`
This tells the model loader to put ALL 32 transformer layers of Qwen 2.5 7B onto the GPU. Setting this to anything less would move layers to the CPU and slow down every single response. Keep this at 32 — your VRAM can handle it with Q4 quantization.

### `contextSize: 32768`
The total token window — how much conversation the AI can "see" at once. At 8,192 you had roughly 20 back-and-forth messages before compression kicked in. At 32,768 you have ~90–100. This is why the UPLINK FAILED error was happening — the old context was too small for the system prompt plus real conversation.

### `kvCacheQuantizationType: 'q8_0'`
The KV cache stores the "memory" of the conversation in compressed form. By default it's stored at full 16-bit float precision. Switching to q8_0 (8-bit quantization) cuts the cache size roughly in half with no meaningful quality loss. This is what makes 32,768 context fit inside 6 GB VRAM — without this, you'd need ~8 GB just for the cache.

### `useMmap: true`
Memory-maps the model file from disk. The operating system loads only the parts of the model file that are actually needed right now, instead of loading the entire file at once. This reduces the RAM spike you see when the server first starts up.

### `useMlock: false`
Deliberately left OFF. If this were ON, it would lock the model in RAM and prevent the OS from managing memory overflow. You want the OS to handle KV cache overflow to RAM freely — locking it would work against that.

### `threads: 8`
The number of CPU threads that assist with processing token batches. The CPU is not running any model layers — it's only helping prepare batches of tokens before they go to the GPU. Set this to your CPU's physical core count (not hyperthreads). If your CPU has 6 cores, use 6. If 12, use 12.

### `batchSize: 512`
How many tokens are grouped together and sent to the GPU at once. 512 is a balanced default. If you have a faster CPU and want to push more tokens per batch, try 1024. If you see RAM spike during long prompt ingestion, try 256.

---

## How to Apply This

Open `llm_config.js` (provided in this package). Find the two configuration objects:

```js
// Model load — controls what goes on GPU
const MODEL_LOAD_CONFIG = {
  gpuLayers: 32,      // ← ALL layers on GPU
  useMmap: true,
  useMlock: false,
};

// Context — controls token window and KV cache
const CONTEXT_CONFIG = {
  contextSize: 32768,              // ← 4x your old window
  kvCacheQuantizationType: 'q8_0', // ← halves cache VRAM cost
  threads: 8,                      // ← match to your CPU core count
  batchSize: 512,
};
```

Replace your current model initialization in `server.js` with the `loadModel()` and `createContext()` calls from `llm_config.js`. See the README for the exact integration pattern.

---

## How to Monitor After Applying

**Check VRAM (run while the server is running and mid-conversation):**
```bash
nvidia-smi
```
Look at the `MEM-Usage` column. You want to see ~5.5–5.8 GB used. If it shows 6.0 GB or an OOM error, reduce `contextSize` to 24576 first.

**Check RAM (Windows):**
Open Task Manager → Performance → Memory. Watch the "In use" value. Target: stays under 16 GB.

**Check RAM (Linux):**
```bash
htop
# or
free -h
```
Watch the `used` column under `Mem`. Target: under 16 GB.

---

## When to Scale Up Further

Once 32,768 is stable for 48 hours of real use, you can increase. Update `contextSize` in `llm_config.js`:

| When ready | Change to | Monitor |
|---|---|---|
| 32,768 stable | `contextSize: 49152` | VRAM stays <5.8 GB, RAM stays <14 GB |
| 49,152 stable | `contextSize: 49152` + `kvCacheQuantizationType: 'q4_0'` | More aggressive cache compression |
| Still stable | `contextSize: 65536` | RAM must stay under 16 GB |

Do one change at a time. Test with a long conversation (30+ messages) before declaring it stable.

---

## If Something Goes Wrong

**UPLINK FAILED (context compression error):**
This means the context is still too small for your system prompt + conversation. Check that `contextSize: 32768` is actually being applied — look for the startup log line `[LLM] Creating context — size: 32768 tokens`.

**CUDA out of memory:**
Your VRAM is genuinely full. Reduce `gpuLayers` from 32 to 28 (offloads 4 layers to CPU), or switch `kvCacheQuantizationType` to `'q4_0'` for more aggressive cache compression.

**Server RAM hits 16 GB:**
Your conversations are very long or you have many concurrent sessions. Either reduce `contextSize` to 24576, or increase the compression aggressiveness in `context_manager.py` by lowering the `reserve_tokens` value.

**Responses become slow:**
Normal for very long contexts — the KV cache lookup takes longer as context grows. This is expected behavior, not an error. If it becomes unacceptable, reduce `contextSize`.
