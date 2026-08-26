import path from "path";
import fs from "fs";
import { createHash } from 'crypto';
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import multer from 'multer';
import mammoth from 'mammoth';
import { pipeline, env } from '@xenova/transformers';
import dotenv from 'dotenv';
import axios from 'axios';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { generateResponse } from './llm_engine.js';

const require     = createRequire(import.meta.url);
const { buildRuntimeInjection } = require('./timestamp_util.cjs');
const _pdfParseMod = require('pdf-parse');
const pdfParse     = typeof _pdfParseMod === 'function' ? _pdfParseMod : _pdfParseMod.default;
const Database    = require('better-sqlite3');
const PDFDocument = require('pdfkit');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Environment configuration — load .env relative to this file so the server
// can be started from any working directory.
// ---------------------------------------------------------------------------
dotenv.config({ path: path.join(__dirname, '.env') });

const PORT         = parseInt(process.env.PORT)             || 3001;
const CORS_ORIGINS = process.env.CORS_ORIGINS               || 'http://localhost:5174';
const MAX_FILE_MB  = parseInt(process.env.MAX_FILE_SIZE_MB) || 10;
const MAX_FILES    = parseInt(process.env.MAX_FILES)         || 5;
const TOP_K        = parseInt(process.env.TOP_K)             || 5;
const VECTOR_DIR   = path.join(__dirname, process.env.VECTOR_STORE_DIR || 'data');
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
const ROUTER_URL   = process.env.ROUTER_URL   || 'http://localhost:5000/route';
const CONTEXT_URL  = process.env.CONTEXT_URL  || 'http://localhost:5007/tools/context';
const LANGUAGE_URL = process.env.LANGUAGE_URL || 'http://localhost:5008/tools/language/correct';
let pythonToolsOnline = false;
// ---------------------------------------------------------------------------

// =============================================================================
// CRITICAL: response_style.md dictates the AI persona, jurisdiction, and formatting.
// Location: response_styles/response_style.md (project root)
// =============================================================================

// Load the centralized response-style system prompt from the versioned template file.
// Only the content between <!-- SYSTEM_PROMPT_START --> and <!-- SYSTEM_PROMPT_END --> is extracted.
function loadSystemPrompt() {
    const promptPath = path.join(__dirname, '..', 'response_styles', 'response_style.md');
    const raw = fs.readFileSync(promptPath, 'utf8');
    const match = raw.match(/<!-- SYSTEM_PROMPT_START -->([\s\S]*?)<!-- SYSTEM_PROMPT_END -->/);
    if (match) return match[1].trim();
    // v3.2: full file is the system prompt when markers are absent
    return raw.trim();
}

function loadRewriterPrompt() {
    const promptPath = path.join(__dirname, '..', 'response_styles', 'response_style.md');
    const raw = fs.readFileSync(promptPath, 'utf8');
    const START_MARKER = 'Rewriter instruction:';
    const start = raw.indexOf(START_MARKER);
    if (start === -1) {
        return 'You are a professional assistant. Correct the grammar and tone of the input message.';
    }
    return raw.slice(start).trim();
}

// ---------------------------------------------------------------------------
// RAG: Text Chunking
// Splits extracted text into overlapping chunks on paragraph boundaries.
// Falls back to character-level windowing for single oversized paragraphs.
// ---------------------------------------------------------------------------
function chunkText(text, maxChars = 600, overlapChars = 100) {
    const paragraphs = text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
    const chunks = [];
    let buf = '';

    for (const para of paragraphs) {
        if (buf.length > 0 && buf.length + 2 + para.length > maxChars) {
            chunks.push(buf.trim());
            // Carry an overlap window into the next chunk to preserve context continuity
            const overlapStart = Math.max(0, buf.length - overlapChars);
            buf = buf.slice(overlapStart).trim() + '\n\n' + para;
        } else {
            buf = buf ? buf + '\n\n' + para : para;
        }
        // Force-split any buffer that still exceeds maxChars (e.g. single huge paragraph)
        while (buf.length > maxChars) {
            chunks.push(buf.slice(0, maxChars).trim());
            buf = buf.slice(maxChars - overlapChars);
        }
    }
    if (buf.trim()) chunks.push(buf.trim());
    return chunks.filter(c => c.length > 0);
}

// ---------------------------------------------------------------------------
// RAG: Local embeddings via @xenova/transformers (fallback)
// Uses Xenova/all-MiniLM-L6-v2 (ONNX, ~22 MB, auto-downloaded on first use).
// The Python AI Layer is the PRIMARY embedding provider. Xenova is the silent
// fallback in case the Python service is unreachable.
// ---------------------------------------------------------------------------
let _embedder = null;
async function getEmbedder() {
    if (!_embedder) {
        console.log('[RAG] Initializing local embedding model (Xenova/all-MiniLM-L6-v2)...');
        env.cacheDir = path.join(__dirname, '..', '.cache', 'xenova');
        _embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
        console.log('[RAG] Embedding model ready.');
    }
    return _embedder;
}

// Xenova fallback — used only when Python service is unreachable
async function embedXenova(text) {
    const pipe = await getEmbedder();
    const result = await pipe(text, { pooling: 'mean', normalize: true });
    return Array.from(result.data);
}

// Primary embed — tries Python service first, falls back to Xenova
async function embed(text) {
    try {
        const res = await axios.post(`${PYTHON_SERVICE_URL}/embed`, { texts: [text] }, { timeout: 10000 });
        return res.data.embeddings[0];
    } catch (err) {
        console.warn('[RAG] Python embed unavailable, falling back to Xenova:', err.message);
        return embedXenova(text);
    }
}

function cosineSim(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom === 0 ? 0 : dot / denom;
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// RAG: Helper — stable SHA-256 hash of a chunk for dedup + embedding cache
// ---------------------------------------------------------------------------
function computeHash(text) {
    return createHash('sha256').update(text).digest('hex');
}

// ---------------------------------------------------------------------------
// RAG: Batch embed — tries Python service first (single call for all texts),
// then falls back to Xenova one-at-a-time if Python is unreachable.
// ---------------------------------------------------------------------------
async function embedBatch(texts, batchSize = 8) {
    // Try Python batch embedding first (much faster — single HTTP call)
    try {
        const res = await axios.post(`${PYTHON_SERVICE_URL}/embed`, { texts }, { timeout: 30000 });
        console.log(`[RAG] Python batch embed: ${texts.length} text(s) embedded successfully.`);
        return res.data.embeddings;
    } catch (err) {
        console.warn('[RAG] Python batch embed unavailable, falling back to Xenova:', err.message);
    }
    // Xenova fallback — batch in groups
    const results = [];
    for (let i = 0; i < texts.length; i += batchSize) {
        const slice = texts.slice(i, i + batchSize);
        const vecs  = await Promise.all(slice.map(t => embedXenova(t)));
        results.push(...vecs);
    }
    return results;
}

// ---------------------------------------------------------------------------
// RAG: Persistent HNSW Vector Store
//
// Uses hnswlib-node for fast approximate nearest-neighbour search with
// on-disk snapshots (hnsw.index + hnsw-meta.json inside VECTOR_DIR).
// If hnswlib-node is unavailable on this platform (e.g. native build failure),
// the store automatically falls back to brute-force cosine similarity with
// the same public API so nothing else needs to change.
//
// Embedding deduplication: every chunk is hashed (SHA-256). Before embedding,
// the hash is checked against the SQLite chunk_embeddings table. If found,
// the stored vector is reused — no re-computation on repeated uploads.
// ---------------------------------------------------------------------------
let HierarchicalNSW = null;
try {
    HierarchicalNSW = require('hnswlib-node').HierarchicalNSW;
    console.log('[VectorStore] hnswlib-node loaded (HNSW mode).');
} catch (e) {
    console.warn('[VectorStore] hnswlib-node unavailable, brute-force cosine fallback active:', e.message);
}

class HNSWVectorStore {
    constructor(dataDir, dim = 384, maxElements = 100000) {
        this.dataDir     = dataDir;
        this.dim         = dim;
        this.maxElements = maxElements;
        this.indexPath   = path.join(dataDir, 'hnsw.index');
        this.metaPath    = path.join(dataDir, 'hnsw-meta.json');
        this.index       = null;        // HierarchicalNSW instance or null
        this.metadata    = new Map();   // id → { text, documentName, chunkIdx, hash }
        this.hashToId    = new Map();   // hash → id  (dedup)
        this.bruteVecs   = new Map();   // id → number[]  (fallback only)
        this.nextId      = 0;
        this.hnswOk      = false;
    }

    async init() {
        if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });

        if (HierarchicalNSW) {
            try {
                this.index = new HierarchicalNSW('cosine', this.dim);
                if (fs.existsSync(this.indexPath) && fs.existsSync(this.metaPath)) {
                    this.index.readIndex(this.indexPath, true);
                    const saved      = JSON.parse(fs.readFileSync(this.metaPath, 'utf8'));
                    this.metadata    = new Map(saved.chunks);
                    this.hashToId    = new Map(saved.hashToId);
                    this.nextId      = saved.nextId || 0;
                    console.log(`[VectorStore] Loaded ${this.metadata.size} chunk(s) from disk (HNSW).`);
                } else {
                    this.index.initIndex(this.maxElements);
                    console.log('[VectorStore] New HNSW index initialised.');
                }
                this.hnswOk = true;
            } catch (e) {
                console.error('[VectorStore] HNSW init error, switching to brute-force:', e.message);
                this.index  = null;
                this.hnswOk = false;
            }
        }

        if (!this.hnswOk && fs.existsSync(this.metaPath)) {
            try {
                const saved   = JSON.parse(fs.readFileSync(this.metaPath, 'utf8'));
                this.metadata = new Map(saved.chunks);
                this.hashToId = new Map(saved.hashToId);
                this.nextId   = saved.nextId || 0;
                console.log(`[VectorStore] Brute-force fallback: restored ${this.metadata.size} chunk metadata(s).`);
            } catch (_) {}
        }
    }

    hasChunks() { return this.metadata.size > 0; }

    async addChunks(chunks) {
        // Filter out chunks already in the index using hash dedup
        const toProcess = chunks
            .map(c => ({ ...c, hash: computeHash(c.text) }))
            .filter(c => !this.hashToId.has(c.hash));

        if (toProcess.length === 0) {
            console.log('[VectorStore] All chunks already indexed — full cache hit.');
            return;
        }
        console.log(`[VectorStore] Embedding ${toProcess.length} new chunk(s)...`);

        // Check SQLite embedding cache for stored vectors
        const cachedVecs = new Map();
        const uncached   = [];
        for (const chunk of toProcess) {
            const row = db.prepare('SELECT vector FROM chunk_embeddings WHERE hash = ?').get(chunk.hash);
            if (row) {
                const buf = row.vector;
                cachedVecs.set(chunk.hash,
                    Array.from(new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)));
            } else {
                uncached.push(chunk);
            }
        }

        // Embed uncached chunks and persist them
        if (uncached.length > 0) {
            const texts = uncached.map(c => c.text);
            const vecs  = await embedBatch(texts);
            const ins   = db.prepare('INSERT OR IGNORE INTO chunk_embeddings (hash, vector) VALUES (?, ?)');
            db.transaction(rows => { for (const r of rows) ins.run(r.hash, r.vec); })(
                uncached.map((c, i) => ({ hash: c.hash, vec: Buffer.from(Float32Array.from(vecs[i]).buffer) }))
            );
            uncached.forEach((c, i) => cachedVecs.set(c.hash, vecs[i]));
        }

        // Add all new chunks to the index
        for (const chunk of toProcess) {
            const vec = cachedVecs.get(chunk.hash);
            const id  = this.nextId++;
            if (this.hnswOk && this.index) {
                try { this.index.addPoint(vec, id); }
                catch (e) { console.error(`[VectorStore] addPoint failed id=${id}:`, e.message); continue; }
            } else {
                this.bruteVecs.set(id, vec);
            }
            this.metadata.set(id, {
                text:           chunk.text,
                documentName:   chunk.documentName,
                chunkIdx:       chunk.chunkIdx,
                hash:           chunk.hash,
                conversationId: chunk.conversationId || null
            });
            this.hashToId.set(chunk.hash, id);
        }

        // Non-blocking snapshot
        setImmediate(() => this._save().catch(e => console.error('[VectorStore] Save error:', e.message)));
    }

    async search(queryVec, k = TOP_K) {
        if (this.metadata.size === 0) return [];

        if (this.hnswOk && this.index) {
            const count = Math.min(k, this.index.getCurrentCount());
            if (count === 0) return [];
            const result = this.index.searchKnn(queryVec, count);
            return result.neighbors
                .map((id, i) => {
                    const meta = this.metadata.get(id);
                    if (!meta) return null;
                    // HNSW cosine space: distance = 1 − similarity
                    return { ...meta, score: 1 - result.distances[i] };
                })
                .filter(Boolean)
                .sort((a, b) => b.score - a.score);
        }

        // Brute-force fallback
        return Array.from(this.metadata.entries())
            .map(([id, meta]) => {
                const vec = this.bruteVecs.get(id);
                if (!vec) return null;
                return { ...meta, score: cosineSim(queryVec, vec) };
            })
            .filter(Boolean)
            .sort((a, b) => b.score - a.score)
            .slice(0, k);
    }

    async _save() {
        const payload = {
            nextId:   this.nextId,
            chunks:   [...this.metadata.entries()],
            hashToId: [...this.hashToId.entries()]
        };
        fs.writeFileSync(this.metaPath, JSON.stringify(payload));
        if (this.hnswOk && this.index) this.index.writeIndex(this.indexPath);
        console.log(`[VectorStore] Snapshot saved (${this.metadata.size} chunk(s)).`);
    }
}

const vectorStore = new HNSWVectorStore(VECTOR_DIR);

// Generation lock removed - Cloud AI supports native concurrency

const systemPrompt = loadSystemPrompt();
const rewriterPrompt = loadRewriterPrompt();
console.log('[aSK Youth] System prompt loaded from response_style.md');

const app = express();

// Cloudflare Tunnel / reverse proxy sends X-Forwarded-For. Without trust proxy,
// express-rate-limit throws ValidationError ERR_ERL_UNEXPECTED_X_FORWARDED_FOR and /api dies.
if (process.env.TRUST_PROXY !== 'false' && process.env.TRUST_PROXY !== '0') {
    const hops = parseInt(process.env.TRUST_PROXY_HOPS || '1', 10);
    app.set('trust proxy', Number.isFinite(hops) && hops > 0 ? hops : 1);
}

// Rate-limit all /api routes: 60 requests per minute per IP
// Cloudflare may send standard Forwarded header; express-rate-limit treats that as validation error unless disabled or keyGenerator handles it — see ERR_ERL_FORWARDED_HEADER.
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests — please slow down.' },
    validate: { forwardedHeader: false },
    skip: (req) => req.method === 'OPTIONS'
});
app.use('/api', apiLimiter);

// Health/readiness: reflect Origin so UI on any domain (custom domains, previews)
// can ping without adding each hostname to CORS_ORIGINS. Chat/uploads stay restricted below.
const healthCors = cors({
    origin: true,
    methods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
});
app.get('/health', healthCors, (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/ready', healthCors, (_req, res) => {
    res.json({ ready: true, message: 'Cloud AI Fallback Engine ready.' });
});

// CORS — restricted to origins listed in CORS_ORIGINS env variable
app.use(cors({
    origin: CORS_ORIGINS.split(',').map(o => o.trim()),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Actor', 'X-Role']
}));
app.use(express.json({ limit: '2mb' }));

// Allowed MIME types and file extensions for uploads
const ALLOWED_MIME = new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'text/markdown', 'text/csv', 'application/octet-stream',
    'image/jpeg', 'image/png', 'image/tiff', 'image/webp'
]);
const ALLOWED_EXT = new Set(['.pdf', '.docx', '.txt', '.md', '.markdown', '.csv',
    '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.webp']);

// Multer: memory storage, strict file-type filter, per-file size cap, max-files cap
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: MAX_FILES },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ALLOWED_MIME.has(file.mimetype) || ALLOWED_EXT.has(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`File type not allowed: ${file.mimetype} (${ext || 'no extension'})`));
        }
    }
});

// ---------------------------------------------------------------------------
// In-memory conversation store  (keyed by conversation id)
// Shape: { id: string, title: string, pinned: boolean, createdAt: number }
// The frontend is the source of truth for message history (localStorage);
// this store tracks only the metadata that the management endpoints need.
// ---------------------------------------------------------------------------
const conversations = new Map();

// ---------------------------------------------------------------------------
// Thread-scoped document store  (keyed by conversation id)
// Stores the full extracted text of every document uploaded in a thread so
// that subsequent messages can re-inject it into the RAG context regardless
// of cosine similarity. Scoped to thread lifetime — data is discarded when
// the conversation is deleted.
// Shape: Map<conversationId, Array<{ documentName: string, documentText: string }>>
// ---------------------------------------------------------------------------
const threadDocuments = new Map();

// ---------------------------------------------------------------------------
// SQLite Events Database
// ---------------------------------------------------------------------------
const DB_PATH = path.join(__dirname, 'data', 'events.db');
if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'));

const db = new Database(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    description TEXT,
    category    TEXT,
    date        TEXT,
    location    TEXT,
    organizer   TEXT,
    status      TEXT DEFAULT 'upcoming',
    requirements TEXT,
    contact     TEXT
  )
`);

// --- Schema migration: add new columns if they don't exist yet ---
const migrationColumns = [
    { name: 'time',            sql: 'ALTER TABLE events ADD COLUMN time TEXT DEFAULT \'\''},
    { name: 'attendees',       sql: 'ALTER TABLE events ADD COLUMN attendees INTEGER DEFAULT 0'},
    { name: 'male_count',      sql: 'ALTER TABLE events ADD COLUMN male_count INTEGER DEFAULT 0'},
    { name: 'female_count',    sql: 'ALTER TABLE events ADD COLUMN female_count INTEGER DEFAULT 0'},
    { name: 'staff_count',     sql: 'ALTER TABLE events ADD COLUMN staff_count INTEGER'},
    { name: 'budget_allotted', sql: 'ALTER TABLE events ADD COLUMN budget_allotted REAL DEFAULT 0'},
];
for (const col of migrationColumns) {
    try { db.exec(col.sql); console.log(`[DB Migration] Added column: ${col.name}`); }
    catch (_) { /* column already exists — safe to ignore */ }
}

// Embedding cache — stores SHA-256(chunk_text) → Float32Array BLOB
// so the same text is never re-embedded across server restarts.
db.exec(`
  CREATE TABLE IF NOT EXISTS chunk_embeddings (
    hash       TEXT PRIMARY KEY,
    vector     BLOB NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  )
`);

// Seed sample SK events once (if database is empty or sparse)
const eventCount = db.prepare('SELECT COUNT(*) as c FROM events').get();
if (eventCount.c < 5) {
  const insert = db.prepare(`
    INSERT INTO events (title, description, category, date, time, location, organizer, status, requirements, contact, attendees, male_count, female_count, staff_count, budget_allotted)
    VALUES (@title, @description, @category, @date, @time, @location, @organizer, @status, @requirements, @contact, @attendees, @male_count, @female_count, @staff_count, @budget_allotted)
  `);
  const seedEvents = [
    { title: 'SK Sports Fest 2025', description: 'Annual inter-barangay sports competition featuring basketball, volleyball, and badminton.', category: 'sports', date: '2025-07-15', time: '08:00', location: 'Barangay Concepcion Dos Multi-Purpose Court', organizer: 'SK Concepcion Dos', status: 'completed', requirements: 'Valid ID, Residency proof', contact: 'SK Secretariat', attendees: 450, male_count: 240, female_count: 210, staff_count: 25, budget_allotted: 45000 },
    { title: 'Youth Leadership Seminar', description: 'Seminar on youth leadership, governance, and civic engagement.', category: 'seminar', date: '2025-08-20', time: '09:00', location: 'Barangay Hall Function Room', organizer: 'SK Chairperson', status: 'completed', requirements: 'School ID', contact: 'SK Office', attendees: 120, male_count: 55, female_count: 65, staff_count: 8, budget_allotted: 15000 },
    { title: 'Linggo ng Kabataan 2025', description: 'Week-long celebration with various youth-led activities and cultural shows.', category: 'general', date: '2025-08-12', time: '07:00', location: 'Barangay Plaza', organizer: 'SK Council', status: 'completed', requirements: 'None', contact: 'SK Council', attendees: 850, male_count: 400, female_count: 450, staff_count: 30, budget_allotted: 120000 },
    { title: 'School Supply Assistance', description: 'Distribution of school kits to indigent youth residents.', category: 'scholarship', date: '2025-06-05', time: '10:00', location: 'Barangay Hall', organizer: 'SK Education Committee', status: 'completed', requirements: 'Enrollment slip', contact: 'SK Secretariat', attendees: 320, male_count: 150, female_count: 170, staff_count: 12, budget_allotted: 50000 },
    { title: 'Community Clean-Up Drive', description: 'Environmental awareness and clean-up drive.', category: 'community', date: '2025-11-08', time: '06:00', location: 'Barangay Streets', organizer: 'SK Environment Committee', status: 'completed', requirements: 'Volunteers', contact: 'SK Environment Head', attendees: 85, male_count: 40, female_count: 45, staff_count: 5, budget_allotted: 5000 },
    { title: 'Mobile Legends Tournament', description: 'E-sports competition for barangay youth gamers.', category: 'sports', date: '2026-03-15', time: '13:00', location: 'Barangay Hall', organizer: 'SK Sports Committee', status: 'upcoming', requirements: 'Team registration', contact: 'SK Sports Head', attendees: 0, male_count: 0, female_count: 0, staff_count: 0, budget_allotted: 15000 },
    { title: 'Health & Wellness Mission', description: 'Free medical checkup and vitamins for youth residents.', category: 'health', date: '2026-04-20', time: '08:00', location: 'Barangay Health Center', organizer: 'SK Health Committee', status: 'upcoming', requirements: 'None', contact: 'SK Health Head', attendees: 0, male_count: 0, female_count: 0, staff_count: 0, budget_allotted: 25000 },
  ];
  const insertMany = db.transaction((rows) => { for (const row of rows) insert.run(row); });
  insertMany(seedEvents);
  console.log('[aSK Youth] Sparse DB detected. Seeded with', seedEvents.length, 'realistic records.');
}
console.log('[aSK Youth] Events DB ready at', DB_PATH);

// --- Phase 6-E Tables & Infrastructure ---
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    full_name     TEXT NOT NULL,
    role          TEXT NOT NULL CHECK(role IN ('admin','chairman','officer','youth')),
    password_hash TEXT NOT NULL,
    status        TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS suggestions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    content         TEXT NOT NULL,
    category        TEXT DEFAULT 'general',
    submitter_name  TEXT DEFAULT 'Anonymous',
    submitter_role  TEXT DEFAULT 'youth',
    status          TEXT DEFAULT 'pending' CHECK(status IN ('pending','reviewed','resolved')),
    admin_response  TEXT,
    responded_by    TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS system_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    actor       TEXT NOT NULL,
    role        TEXT NOT NULL,
    action      TEXT NOT NULL,
    target      TEXT,
    details     TEXT,
    ip_address  TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS event_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id    INTEGER NOT NULL,
    user_id     INTEGER,
    first_name  TEXT,
    mi          TEXT,
    last_name   TEXT,
    suffix      TEXT,
    gender      TEXT,
    address     TEXT,
    timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP,
    status      TEXT DEFAULT 'attended',
    FOREIGN KEY(event_id) REFERENCES events(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Seed default users if empty
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (userCount.c === 0) {
    const salt = bcrypt.genSaltSync(10);
    const insertUser = db.prepare('INSERT INTO users (username, full_name, role, password_hash, status) VALUES (?, ?, ?, ?, ?)');
    insertUser.run('admin', 'System Administrator', 'admin', bcrypt.hashSync('admin2025', salt), 'active');
    insertUser.run('chairman', 'SK Chairperson', 'chairman', bcrypt.hashSync('chairman2025', salt), 'active');
    insertUser.run('officer', 'SK Officer', 'officer', bcrypt.hashSync('officer2025', salt), 'active');
    insertUser.run('youth', 'Juan Dela Cruz', 'youth', bcrypt.hashSync('youth2025', salt), 'active');
    console.log('[aSK Youth] Default users seeded.');
}

// Seed default suggestions if empty or sparse
const suggestionCount = db.prepare('SELECT COUNT(*) as c FROM suggestions').get();
if (suggestionCount.c < 5) {
    const stmt = db.prepare('INSERT INTO suggestions (content, category, submitter_name, submitter_role, status) VALUES (?, ?, ?, ?, ?)');
    stmt.run('Need more lights at the basketball court for evening games.', 'facility', 'Juan Dela Cruz', 'youth', 'pending');
    stmt.run('Requesting for basic first aid training workshop for students.', 'health', 'Maria Clara', 'youth', 'reviewed');
    stmt.run('The trash collection schedule in Zone 4 is irregular and needs fixing.', 'community', 'Anonymous', 'youth', 'pending');
    stmt.run('Proposed SK Inter-Barangay Volleyball League for Summer.', 'sports', 'Leonor Rivera', 'youth', 'resolved');
    stmt.run('Free Wi-Fi access at the Barangay SK Hall.', 'general', 'Crisostomo Ibarra', 'youth', 'pending');
    stmt.run('Livelihood program for out-of-school youth.', 'livelihood', 'Basilio Santos', 'youth', 'pending');
    console.log('[aSK Youth] Sparse suggestions detected. Seeded with realistic data.');
}

// Seed default system logs if empty or sparse
const logCount = db.prepare('SELECT COUNT(*) as c FROM system_logs').get();
if (logCount.c < 5) {
    const stmt = db.prepare('INSERT INTO system_logs (actor, role, action, target, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run('System Administrator', 'admin', 'login_success', 'admin', 'Login via dashboard', '127.0.0.1');
    stmt.run('SK Chairperson', 'chairman', 'login_success', 'chairman', 'Login via mobile', '192.168.1.15');
    stmt.run('SK Officer', 'officer', 'login_success', 'officer', 'Login via web', '192.168.1.20');
    stmt.run('Juan Dela Cruz', 'youth', 'login_success', 'youth', 'Login via web', '192.168.1.25');
    stmt.run('System Administrator', 'admin', 'update_user', 'officer', 'Changed role to officer', '127.0.0.1');
    stmt.run('SK Chairperson', 'chairman', 'view_reports', 'reports', 'Generated Q4 financial report', '192.168.1.15');
    console.log('[aSK Youth] Sparse logs detected. Seeded with realistic data.');
}

// Helper function to write system logs safely
function writeLog(actor, role, action, target, details, ip) {
    try {
        db.prepare('INSERT INTO system_logs (actor, role, action, target, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
          .run(actor || 'System', role || 'system', action, target || null, details || null, ip || null);
    } catch (err) {
        console.error('[writeLog] Failed to record log:', err.message);
    }
}

// --- Authentication & Session Routes ---
const JWT_SECRET = process.env.JWT_SECRET || 'askyouth_super_secret_jwt_key_2026';

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const ip = req.ip || req.socket.remoteAddress;
    if (!username || !password) {
        writeLog('Unknown', 'guest', 'login_fail', username, 'Missing credentials', ip);
        return res.status(400).json({ error: 'Username and password required' });
    }
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        writeLog(username, 'guest', 'login_fail', username, 'Invalid credentials', ip);
        return res.status(401).json({ error: 'Invalid username or password' });
    }
    if (user.status === 'inactive') {
        writeLog(username, user.role, 'login_fail', username, 'Account inactive', ip);
        return res.status(403).json({ error: 'Account is deactivated' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, full_name: user.full_name }, JWT_SECRET, { expiresIn: '24h' });
    writeLog(user.full_name, user.role, 'login_success', user.username, 'Successful authentication', ip);
    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
});

app.post('/api/auth/youth-login', (req, res) => {
    const ip = req.ip || req.socket.remoteAddress;
    const token = jwt.sign({ id: null, username: 'youth_member', role: 'youth', full_name: 'Youth Member', isGuest: true }, JWT_SECRET, { expiresIn: '12h' });
    writeLog('Youth', 'youth', 'login_success', 'youth_member', 'Youth authentication', ip);
    res.json({ token, user: { role: 'youth', full_name: 'Youth Member', username: 'youth_member', isGuest: true } });
});

app.post('/api/auth/logout', (req, res) => {
    const actor = req.headers['x-actor'] || 'User';
    const role  = req.headers['x-role'] || 'user';
    const ip    = req.ip || req.socket.remoteAddress;
    writeLog(actor, role, 'logout', null, 'Session closed', ip);
    res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.isGuest) {
            return res.json({ user: { role: 'youth', isGuest: true, full_name: 'Guest Youth', username: 'guest' } });
        }
        const user = db.prepare('SELECT id, username, full_name, role, status, created_at FROM users WHERE id = ?').get(decoded.id);
        if (!user || user.status === 'inactive') return res.status(401).json({ error: 'User invalid or inactive' });
        res.json({ user });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

function resolveActiveRole(req) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        try {
            const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
            if (decoded.role === 'admin') return 'system_admin';
            return decoded.role || 'youth';
        } catch (_) { /* fall through */ }
    }
    return 'youth';
}

function buildFullSystemPrompt(eventContext, activeRole, clientDateString = null) {
    const roleForPrompt = activeRole === 'admin' ? 'system_admin' : (activeRole || 'youth');
    const runtimeBlock = buildRuntimeInjection(roleForPrompt, pythonToolsOnline);
    const clientDateBlock = clientDateString ? `\n[CRITICAL SYSTEM INSTRUCTION: The user's CURRENT DATE AND TIME is exactly "${clientDateString}". If asked about today's date, tomorrow's date, or any time-relative questions, you MUST base your answer on this exact date.]\n` : '';
    return runtimeBlock + clientDateBlock + systemPrompt + (eventContext || '');
}

function messagesToRoleFormat(messages) {
    return messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: String(m.content || '') }));
}

async function compressChatHistory(messages) {
    const roleMessages = messagesToRoleFormat(messages);
    if (!pythonToolsOnline || roleMessages.length === 0) return roleMessages;
    try {
        const res = await axios.post(CONTEXT_URL, {
            messages: roleMessages,
            system_prompt_tokens: 1200,
            context_size: contextSize,
            reserve_tokens: 1500,
        }, { timeout: 20000 });
        return res.data?.messages || roleMessages;
    } catch (err) {
        console.warn('[Python Tools] context_manager unavailable:', err.message);
        return roleMessages;
    }
}

// ── Deterministic tool result formatters (no second LLM call needed) ───────
function formatToolResult(toolName, result, cleanResponse) {
    const intro = cleanResponse ? cleanResponse + '\n\n' : '';

    if (result?.status === 'error') {
        return `${intro}Sorry, I wasn't able to complete the ${toolName} request: ${result.message}`;
    }

    switch (toolName) {
        case 'budget_estimator': {
            const lineItems = (result.line_items || [])
                .map(li => `  • ${li.item}: ₱${Number(li.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`)
                .join('\n');
            const total = Number(result.total).toLocaleString('en-PH', { minimumFractionDigits: 2 });
            const subtotal = Number(result.subtotal).toLocaleString('en-PH', { minimumFractionDigits: 2 });
            return `${intro}Here is the estimated budget for your ${result.activity_type} with ${result.participants} participants${result.include_meals ? ' (meals included)' : ''}:\n\nBudget Breakdown\n${lineItems}\n\nSubtotal: ₱${subtotal}\nEstimated Total: ₱${total}\n\n${result.compliance_note || ''}`.trim();
        }
        case 'document_generator': {
            const downloadUrl = result.download_url || '';
            const preview = result.preview || '';
            return `${intro}The document has been generated successfully.\n\n${preview ? '**' + preview + '**\n\n' : ''}[📥 Download DOCX Document](${downloadUrl})`.trim();
        }
        case 'attendance_exporter': {
            const dlUrl = result.download_url || result.url || '';
            const count = result.count != null ? `Total attendees exported: ${result.count}.` : '';
            return `${intro}Attendance list exported successfully. ${count}${dlUrl ? '\n\nDownload: ' + dlUrl : ''}`.trim();
        }
        case 'narrative_compiler': {
            const narrative = result.narrative || result.text || '';
            return `${intro}${narrative}`.trim();
        }
        case 'summary_generator': {
            const summary = result.summary || result.text || '';
            return `${intro}${summary}`.trim();
        }
        default: {
            // Generic fallback — show JSON-free summary
            const keys = Object.keys(result).filter(k => !['status'].includes(k));
            const parts = keys.map(k => `${k}: ${JSON.stringify(result[k])}`).join('\n');
            return `${intro}Tool result (${toolName}):\n${parts}`.trim();
        }
    }
}

async function postProcessAIResponse(rawReply, { fullSystemPrompt, chatHistoryArr, userPrompt, onToken }) {
    let text = String(rawReply || '').trim();
    if (!text) return { finalReply: text, toolUsed: null };

    if (pythonToolsOnline) {
        try {
            const langRes = await axios.post(LANGUAGE_URL, { text, language: 'auto' }, { timeout: 30000 });
            if (langRes.data?.corrected) text = langRes.data.corrected;
        } catch (err) {
            console.warn('[Python Tools] language_corrector unavailable:', err.message);
        }
    }

    if (!pythonToolsOnline) return { finalReply: text.replace(/<TOOL>[\s\S]*?<\/TOOL>/g, '').trim(), toolUsed: null };

    try {
        const routed = await axios.post(ROUTER_URL, { raw_response: text }, { timeout: 90000 });
        const data = routed.data;
        if (data?.has_tool) {
            const formatted = formatToolResult(data.tool, data.tool_result, data.clean_response);
            // Stream formatted result token-by-token if onToken is provided
            if (onToken && formatted) {
                // Send in chunks to simulate streaming
                const chunkSize = 40;
                for (let i = 0; i < formatted.length; i += chunkSize) {
                    onToken(formatted.slice(i, i + chunkSize));
                }
            }
            return { finalReply: formatted, toolUsed: data.tool || null };
        }
        return { finalReply: (data?.clean_response || text).trim(), toolUsed: null };
    } catch (err) {
        console.warn('[Python Tools] tool_router unavailable:', err.message);
        return { finalReply: text.replace(/<TOOL>[\s\S]*?<\/TOOL>/g, '').trim(), toolUsed: null };
    }
}

// --- Admin Analytics & Logging API Routes ---
app.get('/api/admin/stats', (req, res) => {
    try {
        const actor = req.headers['x-actor'] || 'Admin';
        const role  = req.headers['x-role'] || 'admin';
        writeLog(actor, role, 'view_dashboard_stats', 'analytics', 'Accessed overview telemetry', req.ip);

        const total_events = db.prepare('SELECT COUNT(*) as c FROM events').get().c;
        const total_attendees = db.prepare('SELECT SUM(attendees) as s FROM events').get().s || 0;
        const total_budget = db.prepare('SELECT SUM(budget_allotted) as s FROM events').get().s || 0;
        const pending_suggestions = db.prepare("SELECT COUNT(*) as c FROM suggestions WHERE status = 'pending'").get().c;
        const active_users = db.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'active'").get().c;
        res.json({ total_events, total_attendees, total_budget, pending_suggestions, active_users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/logs', (req, res) => {
    try {
        const actor = req.headers['x-actor'] || 'Admin';
        const role  = req.headers['x-role'] || 'admin';
        writeLog(actor, role, 'view_system_logs', 'logs', `Accessed audit logs page ${req.query.page || 1}`, req.ip);

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const actorFilter = req.query.actor ? `%${req.query.actor}%` : null;
        const actionFilter = req.query.action ? `%${req.query.action}%` : null;

        let baseQuery = 'FROM system_logs WHERE 1=1';
        const params = [];
        if (actorFilter) { baseQuery += ' AND actor LIKE ?'; params.push(actorFilter); }
        if (actionFilter) { baseQuery += ' AND action LIKE ?'; params.push(actionFilter); }

        const total = db.prepare(`SELECT COUNT(*) as c ${baseQuery}`).get(...params).c;
        const logs = db.prepare(`SELECT * ${baseQuery} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);

        res.json({ logs, total, page, totalPages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/participation', (req, res) => {
    try {
        const list = db.prepare('SELECT title, category, attendees, male_count, female_count FROM events ORDER BY attendees DESC').all();
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/budget', (req, res) => {
    try {
        const list = db.prepare('SELECT category, SUM(budget_allotted) as total_budget, COUNT(*) as count FROM events GROUP BY category').all();
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- User Management API Routes ---
app.get('/api/users', (req, res) => {
    try {
        const actor = req.headers['x-actor'] || 'Admin';
        const role  = req.headers['x-role'] || 'admin';
        writeLog(actor, role, 'view_user_list', 'users', 'Accessed user management roster', req.ip);

        const users = db.prepare('SELECT id, username, full_name, role, status, created_at FROM users ORDER BY created_at DESC').all();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', (req, res) => {
    const { username, full_name, role, password, status, admin_token } = req.body;
    const actor = req.headers['x-actor'] || 'Admin';
    const actorRole = req.headers['x-role'] || 'admin';
    const ip = req.ip || req.socket.remoteAddress;

    if (!username || !full_name || !role || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (role === 'admin') {
        const expectedToken = process.env.ADMIN_CREATION_TOKEN || 'SECRET_ADMIN_TOKEN_123';
        if (!admin_token || admin_token !== expectedToken) {
            return res.status(401).json({ error: 'Invalid or missing admin authorization token' });
        }
    }

    try {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        const stmt = db.prepare('INSERT INTO users (username, full_name, role, password_hash, status) VALUES (?, ?, ?, ?, ?)');
        const result = stmt.run(username.trim(), full_name.trim(), role, hash, status || 'active');
        writeLog(actor, actorRole, 'create_user', username, `Created account for ${full_name} (${role})`, ip);
        res.json({ id: result.lastInsertRowid, message: 'User created successfully' });
    } catch (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username already exists' });
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const { full_name, role, status, password, admin_token } = req.body;
    const actor = req.headers['x-actor'] || 'Admin';
    const actorRole = req.headers['x-role'] || 'admin';
    const ip = req.ip || req.socket.remoteAddress;

    try {
        const targetUser = db.prepare('SELECT username FROM users WHERE id = ?').get(id);
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        if (password) {
            const expectedToken = process.env.ADMIN_CREATION_TOKEN || 'SECRET_ADMIN_TOKEN_123';
            if (!admin_token || admin_token !== expectedToken) {
                return res.status(401).json({ error: 'Invalid or missing admin authorization token for password change' });
            }
        }

        const updates = [];
        const params = [];
        if (full_name) { updates.push('full_name = ?'); params.push(full_name.trim()); }
        if (role) { updates.push('role = ?'); params.push(role); }
        if (status) { updates.push('status = ?'); params.push(status); }
        if (password) {
            updates.push('password_hash = ?');
            params.push(bcrypt.hashSync(password, bcrypt.genSaltSync(10)));
        }
        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

        params.push(id);
        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        writeLog(actor, actorRole, 'update_user', targetUser.username, `Updated attributes: ${Object.keys(req.body).join(', ')}`, ip);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const actor = req.headers['x-actor'] || 'Admin';
    const actorRole = req.headers['x-role'] || 'admin';
    const ip = req.ip || req.socket.remoteAddress;

    try {
        const targetUser = db.prepare('SELECT username FROM users WHERE id = ?').get(id);
        if (!targetUser) return res.status(404).json({ error: 'User not found' });
        // Safe delete/deactivation
        db.prepare("UPDATE users SET status = 'inactive' WHERE id = ?").run(id);
        writeLog(actor, actorRole, 'delete_user', targetUser.username, 'Deactivated user account', ip);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Suggestions Module API Routes ---
app.get('/api/suggestions', (req, res) => {
    try {
        const list = db.prepare('SELECT * FROM suggestions ORDER BY created_at DESC').all();
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/suggestions', (req, res) => {
    const { content, category, submitter_name, submitter_role } = req.body;
    const ip = req.ip || req.socket.remoteAddress;
    if (!content) return res.status(400).json({ error: 'Content is required' });
    try {
        const stmt = db.prepare('INSERT INTO suggestions (content, category, submitter_name, submitter_role) VALUES (?, ?, ?, ?)');
        const resDb = stmt.run(content.trim(), category || 'general', submitter_name || 'Anonymous', submitter_role || 'youth');
        writeLog(submitter_name || 'Anonymous', submitter_role || 'youth', 'create_suggestion', `ID ${resDb.lastInsertRowid}`, 'Submitted feedback', ip);
        res.json({ id: resDb.lastInsertRowid, success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/suggestions/:id', (req, res) => {
    const { id } = req.params;
    const { status, admin_response, responded_by } = req.body;
    const actor = req.headers['x-actor'] || responded_by || 'Admin';
    const actorRole = req.headers['x-role'] || 'admin';
    const ip = req.ip || req.socket.remoteAddress;

    try {
        db.prepare('UPDATE suggestions SET status = ?, admin_response = ?, responded_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(status || 'reviewed', admin_response || '', responded_by || 'Admin', id);
        writeLog(actor, actorRole, 'update_suggestion', `ID ${id}`, `Status changed to ${status}`, ip);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Detect whether the user's query is asking about events/programs
const EVENT_KEYWORDS = /\b(event|events|program|programs|activity|activities|schedule|upcoming|calendar|sports|scholarship|seminar|training|workshop|assembly|clean.?up|fun.?run|livelihood|kabataan|supply|assistance|incentive|mayroon|anong|kelan|saan|paano|list|show|what.*happening|what.*planned|magkano|gaano|budget|attendees|attendance|staff|cultural|health|ilan|participants|happen|happening|fetch|records|record|registered|registrant|registrants|who attended|how many|participants|seminar|leadership|sports fest|clean.?up|general assembly|report|accomplishment|summary)\b/i;

function isEventQuery(text) {
    return EVENT_KEYWORDS.test(text);
}

function fetchEventsAsContext(filterStatus) {
    let rows;
    if (filterStatus) {
        rows = db.prepare('SELECT * FROM events WHERE status = ? ORDER BY date ASC').all(filterStatus);
    } else {
        rows = db.prepare('SELECT * FROM events ORDER BY date DESC').all();
    }
    if (rows.length === 0) return null;
    const formatted = rows.map(e => {
        let entry = `- ${e.title} (${e.status.toUpperCase()})\n  Date: ${e.date}${e.time ? ' at ' + e.time : ''}\n  Category: ${e.category}\n  Location: ${e.location}\n  Description: ${e.description}`;
        // Use event_logs count as authoritative attendee count if available
        const logCount = db.prepare('SELECT COUNT(*) as c FROM event_logs WHERE event_id = ?').get(e.id);
        const actualAttendees = logCount?.c || 0;
        if (actualAttendees > 0) {
            entry += `\n  Registered Attendees (from event logs): ${actualAttendees}`;
        } else if (e.attendees > 0) {
            entry += `\n  Attendees (recorded): ${e.attendees} (Male: ${e.male_count || 0}, Female: ${e.female_count || 0})`;
        } else {
            entry += `\n  Attendees: 0 (no registrations recorded in the system)`;
        }
        if (e.staff_count != null) entry += `\n  Staff: ${e.staff_count}`;
        if (e.budget_allotted > 0) entry += `\n  Budget Allotted: PHP ${Number(e.budget_allotted).toLocaleString()}`;
        entry += `\n  Requirements: ${e.requirements}\n  Contact: ${e.contact}`;
        return entry;
    }).join('\n\n');
    return `SK Events Database (Barangay Concepcion Dos):\n\n${formatted}\n\nIMPORTANT: The above data is the COMPLETE and AUTHORITATIVE record. Do NOT invent, estimate, or add ANY data not shown above (no demographics, schedules, satisfaction rates, or participant details unless explicitly listed).`;
}

// API to list events (for future admin panel)
app.get('/api/events', (req, res) => {
    const { status, category } = req.query;
    let query = 'SELECT * FROM events';
    const params = [];
    const conditions = [];
    if (status) { conditions.push('status = ?'); params.push(status); }
    if (category) { conditions.push('category = ?'); params.push(category); }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY date ASC';
    res.json(db.prepare(query).all(...params));
});

// API to create a new event
app.post('/api/events', (req, res) => {
    const { title, description, category, date, time, location, organizer, status, requirements, contact, attendees, male_count, female_count, staff_count, budget_allotted } = req.body;
    if (!title || !date) return res.status(400).json({ error: 'title and date are required' });
    const stmt = db.prepare('INSERT INTO events (title, description, category, date, time, location, organizer, status, requirements, contact, attendees, male_count, female_count, staff_count, budget_allotted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const result = stmt.run(
        title, description || '', category || 'general', date, time || '',
        location || '', organizer || '', status || 'upcoming', requirements || '', contact || '',
        parseInt(attendees) || 0, parseInt(male_count) || 0, parseInt(female_count) || 0,
        staff_count != null && staff_count !== '' ? parseInt(staff_count) : null,
        parseFloat(budget_allotted) || 0
    );
    const actor = req.headers['x-actor'] || 'Admin';
    const role  = req.headers['x-role'] || 'admin';
    writeLog(actor, role, 'create_event', title, `Created event ID ${result.lastInsertRowid}`, req.ip);
    res.json({ id: result.lastInsertRowid, message: 'Event created.' });
});

// API to update an event
app.patch('/api/events/:id', (req, res) => {
    const { id } = req.params;
    const fields = req.body;
    const allowed = ['title','description','category','date','time','location','organizer','status','requirements','contact','attendees','male_count','female_count','staff_count','budget_allotted'];
    const updates = Object.keys(fields).filter(k => allowed.includes(k));
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    const set = updates.map(k => `${k} = ?`).join(', ');
    const vals = updates.map(k => fields[k]);
    db.prepare(`UPDATE events SET ${set} WHERE id = ?`).run(...vals, id);
    const actor = req.headers['x-actor'] || 'Admin';
    const role  = req.headers['x-role'] || 'admin';
    writeLog(actor, role, 'update_event', `Event ID ${id}`, `Updated fields: ${updates.join(', ')}`, req.ip);
    res.json({ success: true });
});

// API to delete an event
app.delete('/api/events/:id', (req, res) => {
    const { id } = req.params;
    const event = db.prepare('SELECT title FROM events WHERE id = ?').get(id);
    db.prepare('DELETE FROM events WHERE id = ?').run(id);
    const actor = req.headers['x-actor'] || 'Admin';
    const role  = req.headers['x-role'] || 'admin';
    writeLog(actor, role, 'delete_event', event?.title || `ID ${id}`, 'Deleted event record', req.ip);
    res.json({ success: true });
});

// --- QR Attendance API Routes ---

// Generate QR Code for an Event
app.get('/api/events/:id/qr', async (req, res) => {
    const { id } = req.params;
    try {
        const event = db.prepare('SELECT id, title, qr_token FROM events WHERE id = ?').get(id);
        if (!event) return res.status(404).json({ error: 'Event not found' });
        
        // Deep link payload
        const payload = `https://askyouth.online/?scan=${event.id}${event.qr_token ? `&t=${event.qr_token}` : ''}`;
        const qrBuffer = await QRCode.toBuffer(payload, { width: 400, margin: 2, color: { dark: '#111827', light: '#FFFFFF' } });
        
        res.setHeader('Content-Type', 'image/png');
        res.send(qrBuffer);
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

// Scan Event QR to record attendance
app.post('/api/events/scan', (req, res) => {
    const { eventId, t, first_name, mi, last_name, suffix, gender, address } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    
    let decoded;
    try {
        const token = authHeader.split(' ')[1];
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token. Please log in again.' });
    }

    if (!eventId) return res.status(400).json({ error: 'Missing Event ID' });

    try {
        const event = db.prepare('SELECT status, qr_token FROM events WHERE id = ?').get(eventId);
        if (!event) return res.status(404).json({ error: 'Event not found' });
        if (event.status === 'completed') return res.status(400).json({ error: 'This event has already ended.' });

        if (event.qr_token && event.qr_token !== t) {
            return res.status(403).json({ error: 'Invalid or expired QR code.' });
        }

        if (decoded.isGuest || !decoded.id) {
            // Guest/Youth Flow
            if (!first_name || !last_name) {
                return res.status(400).json({ error: 'Name is required for guest attendance.' });
            }
            
            // Check if user already scanned by exact name
            const existing = db.prepare('SELECT id, timestamp FROM event_logs WHERE event_id = ? AND LOWER(first_name) = ? AND LOWER(last_name) = ?').get(eventId, first_name.toLowerCase(), last_name.toLowerCase());
            if (existing) {
                return res.json({ status: 'duplicate', message: 'You have already recorded your attendance for this event.', timestamp: existing.timestamp });
            }

            // Record attendance for guest
            const stmt = db.prepare('INSERT INTO event_logs (event_id, first_name, mi, last_name, suffix, gender, address, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            stmt.run(eventId, first_name, mi || null, last_name, suffix || null, gender || null, address || null, 'attended');
        } else {
            // Registered User Flow
            const userId = decoded.id;
            const existing = db.prepare('SELECT id, timestamp FROM event_logs WHERE event_id = ? AND user_id = ?').get(eventId, userId);
            if (existing) {
                return res.json({ status: 'duplicate', message: 'You have already recorded your attendance for this event.', timestamp: existing.timestamp });
            }

            // Record attendance for registered user
            const stmt = db.prepare('INSERT INTO event_logs (event_id, user_id, status) VALUES (?, ?, ?)');
            stmt.run(eventId, userId, 'attended');
        }
        
        // Update attendees count
        db.prepare('UPDATE events SET attendees = attendees + 1 WHERE id = ?').run(eventId);

        res.json({ status: 'success', message: 'Attendance recorded successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Event Logs (Admin/Officer only)
app.get('/api/events/:id/logs', (req, res) => {
    const { id } = req.params;
    try {
        const logs = db.prepare(`
            SELECT el.id, el.timestamp, el.status, 
                   COALESCE(u.full_name, el.first_name || ' ' || COALESCE(el.mi || ' ', '') || el.last_name || COALESCE(' ' || el.suffix, '')) as userName,
                   COALESCE(u.username, 'Guest') as username,
                   el.gender, el.address
            FROM event_logs el
            LEFT JOIN users u ON el.user_id = u.id
            WHERE el.event_id = ?
            ORDER BY el.timestamp DESC
        `).all(id);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Refresh QR Code
app.post('/api/events/:id/refresh-qr', (req, res) => {
    const { id } = req.params;
    const { admin_token } = req.body;

    if (!admin_token || admin_token !== process.env.ADMIN_CREATION_TOKEN) {
        return res.status(403).json({ error: 'Unauthorized: Invalid Admin Token.' });
    }

    try {
        const event = db.prepare('SELECT qr_rotated_at FROM events WHERE id = ?').get(id);
        if (!event) return res.status(404).json({ error: 'Event not found' });

        // Get current date in SGT
        const sgtFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' });
        const currentDateSGT = sgtFormatter.format(new Date());

        if (event.qr_rotated_at === currentDateSGT) {
            return res.status(429).json({ error: 'QR Code can only be refreshed once per day.' });
        }

        const crypto = require('crypto');
        const newToken = crypto.randomBytes(8).toString('hex');

        db.prepare('UPDATE events SET qr_token = ?, qr_rotated_at = ? WHERE id = ?').run(newToken, currentDateSGT, id);
        
        res.json({ success: true, message: 'QR Code refreshed successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Database error while refreshing QR' });
    }
});

// ---------------------------------------------------------------------------
// Event Document Parser — keyword extraction via Python + Qwen AI fallback
// ---------------------------------------------------------------------------
app.post('/api/events/parse-document', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

        const { buffer, mimetype, originalname } = req.file;
        console.log(`[ParseDoc] Received ${originalname} (${mimetype}, ${buffer.length} bytes)`);

        // Step 1: Forward to Python keyword scanner
        const FormData = (await import('form-data')).default;
        const form = new FormData();
        form.append('file', buffer, { filename: originalname || 'upload', contentType: mimetype });
        const pyRes = await axios.post(`${PYTHON_SERVICE_URL}/parse-event-document`, form, {
            headers: form.getHeaders(),
            timeout: 120000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        });
        const pyResult = pyRes.data;
        console.log(`[ParseDoc] Python returned ${Object.keys(pyResult.extracted || {}).length} fields, needs_ai=${pyResult.needs_ai}`);

        let merged = { ...pyResult.extracted };
        let source = {};
        for (const key of Object.keys(pyResult.extracted)) {
            source[key] = 'keyword';
        }

        // Step 2: If needs_ai, call Qwen for low-confidence field extraction
        if (pyResult.needs_ai && context) {
            const lowConfFields = [];
            const allFields = ['title', 'date', 'time', 'location', 'organizer', 'category',
                               'attendees', 'male_count', 'female_count', 'staff_count',
                               'budget_allotted', 'description'];
            for (const f of allFields) {
                if ((pyResult.confidence[f] || 0) < 0.6) lowConfFields.push(f);
            }

            if (lowConfFields.length > 0) {
                console.log(`[ParseDoc] Invoking AI for fields: ${lowConfFields.join(', ')}`);
                const rawTextSlice = (pyResult.raw_text || '').slice(0, 3000);
                const extractPrompt = `The following document text was extracted from an uploaded event file. Extract ONLY the fields listed below and return them as a single valid JSON object. Use null for any field you cannot find. Do not explain.\nFields needed: ${lowConfFields.join(', ')}\nDocument text:\n"""${rawTextSlice}"""\nRespond with ONLY the JSON object.`;

                try {
                    const aiReply = await generateResponse(
                        'You are a structured data extractor. Return ONLY valid JSON. No explanation.',
                        extractPrompt,
                        [],
                        { temperature: 0.1, maxTokens: 512 }
                    );
                    console.log('[ParseDoc] AI raw reply:', String(aiReply).slice(0, 300));

                    // Parse JSON from AI reply
                    const jsonMatch = String(aiReply).match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const aiFields = JSON.parse(jsonMatch[0]);
                        for (const f of lowConfFields) {
                            if (aiFields[f] !== undefined && aiFields[f] !== null) {
                                // Keyword wins if confidence >= 0.6, else use AI
                                if ((pyResult.confidence[f] || 0) < 0.6) {
                                    merged[f] = aiFields[f];
                                    source[f] = 'ai';
                                }
                            }
                        }
                    }
                } catch (aiErr) {
                    console.error('[ParseDoc] AI extraction failed:', aiErr.message);
                    // Continue with keyword-only results
                }
            }
        }

        res.json({
            extracted: merged,
            confidence: pyResult.confidence,
            source,
            raw_text_preview: (pyResult.raw_text || '').slice(0, 300),
        });
    } catch (err) {
        console.error('[ParseDoc] Route error:', err.message);
        res.status(500).json({ error: err.message || 'Document parsing failed.' });
    }
});

// ---------------------------------------------------------------------------
// OCR proxy — sends raw file buffer to Python AI Layer's /ocr endpoint
// ---------------------------------------------------------------------------
async function ocrViaPhython(buffer, mimeType, originalName) {
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('file', buffer, { filename: originalName || 'upload', contentType: mimeType });
    const res = await axios.post(`${PYTHON_SERVICE_URL}/ocr`, form, {
        headers: form.getHeaders(),
        timeout: 60000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
    });
    const text = res.data.extracted_text || '';
    console.log(`[OCR] Extracted ${text.length} chars from ${originalName} (${res.data.pages} page(s))`);
    return text;
}

// Enhanced text extraction — preserves tables and supports multiple text-based formats
async function extractTextFromFile(buffer, mimeType, originalName) {
    const ext = path.extname(originalName || '').toLowerCase();

    // Image files — go straight to OCR (Python AI Layer)
    const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/tiff', 'image/webp', 'image/bmp']);
    const IMAGE_EXTS  = new Set(['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.webp', '.bmp']);
    if (IMAGE_MIMES.has(mimeType) || IMAGE_EXTS.has(ext)) {
        return await ocrViaPhython(buffer, mimeType || 'image/png', originalName);
    }

    // PDF
    if (mimeType === 'application/pdf') {
        const data = await pdfParse(buffer);
        const text = data.text;
        // If pdf-parse returns empty/near-empty text, try OCR fallback (scanned PDF)
        if (text.trim().length < 20) {
            console.log('[OCR] PDF appears to be scanned (no selectable text). Attempting OCR...');
            try {
                return await ocrViaPhython(buffer, 'application/pdf', originalName);
            } catch (ocrErr) {
                console.warn('[OCR] Fallback failed:', ocrErr.message);
                return text; // return whatever pdf-parse got
            }
        }
        return text;
    }

    // DOCX — convert to HTML first so table rows/cells are readable, then strip tags
    if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        ext === '.docx'
    ) {
        const result = await mammoth.convertToHtml({ buffer });
        // Convert <tr> to newlines and <td>/<th> to tab-separated columns, then strip remaining tags
        const readable = result.value
            .replace(/<\/tr>/gi, '\n')
            .replace(/<\/td>|<\/th>/gi, '\t')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/\t\n/g, '\n')   // tidy trailing tabs before newlines
            .replace(/\n{3,}/g, '\n\n') // collapse excess blank lines
            .trim();
        return readable;
    }

    // Plain text, Markdown, CSV — direct UTF-8 decode
    if (
        mimeType.startsWith('text/') ||
        ['.txt', '.md', '.markdown', '.csv'].includes(ext)
    ) {
        return buffer.toString('utf8');
    }

    // Fallback: try UTF-8 for octet-stream if extension is recognisable text
    if (mimeType === 'application/octet-stream' && ['.txt', '.md', '.markdown', '.csv'].includes(ext)) {
        return buffer.toString('utf8');
    }

    throw new Error(`Unsupported file type: ${mimeType} (${ext || 'no extension'})`);
}

let contextSize = 100000;

vectorStore.init()
    .then(() => console.log('[VectorStore] Persistent index ready.'))
    .catch(err => console.error('[VectorStore] Init error:', err));

// ---------------------------------------------------------------------------
// Python AI Layer health check — runs at startup, logs warning if unavailable.
// The Node.js backend continues to work even if the Python service is down;
// all Python feature calls have individual try/catch fallbacks.
// ---------------------------------------------------------------------------
async function checkPythonService() {
    try {
        const res = await axios.get(`${PYTHON_SERVICE_URL}/health`, { timeout: 3000 });
        console.log(`[Python AI] Service is UP at ${PYTHON_SERVICE_URL}:`, JSON.stringify(res.data));
    } catch (err) {
        console.warn(`[Python AI] Service at ${PYTHON_SERVICE_URL} is UNREACHABLE (${err.message}). Python features (language detection, intent classification, embedding, summarization) will degrade to fallbacks.`);
    }
}
// Delay the health check so Python models have time to load (~15-20s for all 3 models)
setTimeout(() => checkPythonService(), 30000);

async function refreshPythonToolsStatus() {
    try {
        await axios.get(ROUTER_URL.replace('/route', '/services'), { timeout: 2500 });
        if (!pythonToolsOnline) console.log('[Python Tools] Microservices router is UP (ports 5000–5008).');
        pythonToolsOnline = true;
    } catch {
        if (pythonToolsOnline) console.warn('[Python Tools] Microservices router unreachable — tools disabled for prompts.');
        pythonToolsOnline = false;
    }
}
setTimeout(refreshPythonToolsStatus, 8000);
setInterval(refreshPythonToolsStatus, 45_000);

// ---------------------------------------------------------------------------
// Fused retrieval helper — Vector RAG + SQL events
// Called by both /api/chat and /api/chat/stream so the logic stays DRY.
// Returns: { finalUserPrompt, eventContext, retrievedChunks }
// ---------------------------------------------------------------------------

// Semantic Gatekeeper: returns true if the query is clearly casual/trivial and
// does NOT warrant a vector search. Keeps RAG sources out of greetings/tests.
function isCasualQuery(query) {
    const q = query.trim().toLowerCase();
    // Known casual triggers (exact or prefix match)
    const casualPhrases = [
        'hi', 'hello', 'hey', 'kamusta', 'kumusta', 'test', 'testing',
        'testing testing', 'anyone there', 'anyone there?', 'hello?',
        'hi there', 'good morning', 'good afternoon', 'good evening',
        'magandang umaga', 'magandang hapon', 'magandang gabi'
    ];
    if (casualPhrases.includes(q)) return true;
    // Short query with no SK-specific keywords
    const skKeywords = /\b(sk|youth|barangay|sangguniang|kabataan|concepcion|marikina|program|event|budget|scholarship|form|document|resolution|fund|ordinance|record|report|minutes|meeting|official|service|application|request|complaint|certificate|clearance)\b/i;
    if (q.length < 20 && !skKeywords.test(q)) return true;
    return false;
}

async function buildRagContext(currentQuery, documentsData, conversationId = null) {
    let retrievedChunks  = [];
    let finalUserPrompt  = currentQuery;

    // --- Python AI Layer: Language Detection (Feature 4) ---
    // Guard: only inject Filipino flag when:
    //   1. Detector confidence >= 0.85 (low confidence = likely misclassification on short English)
    //   2. Query does not start with clear English words (hello, hi, may, can, what, how, etc.)
    // This prevents "hello" / "May I ask" / English sentences from triggering Filipino replies.
    let languageFlag = '';
    const ENGLISH_START = /^(hello|hi|hey|good\s|may i|can i|what|how|who|when|where|why|is |are |do |does |could|would|please|i |my |the |a |an |can you|tell me|show|give|help|yes|no|ok|okay|sure|thanks|thank)/i;
    try {
        const langRes = await axios.post(`${PYTHON_SERVICE_URL}/detect-language`, { text: currentQuery }, { timeout: 3000 });
        const confidence = langRes.data.confidence ?? 0;
        const isClearlyEnglish = ENGLISH_START.test(currentQuery.trim());
        if (langRes.data.is_filipino && confidence >= 0.85 && !isClearlyEnglish) {
            languageFlag = '\n\n[Language instruction: The user is writing in Filipino/Tagalog. Respond in the same language unless they switch.]';
            console.log(`[Python AI] Language detected: ${langRes.data.language} (Filipino) — confidence: ${confidence}`);
        } else if (langRes.data.is_filipino) {
            console.log(`[Python AI] Filipino detection skipped — confidence ${confidence} < 0.85 or message appears English.`);
        }
    } catch (err) {
        // Non-fatal — continue without language detection
        console.warn('[Python AI] Language detection unavailable:', err.message);
    }

    // 0. Persist newly uploaded documents into the thread-scoped store
    if (documentsData.length > 0 && conversationId) {
        if (!threadDocuments.has(conversationId)) threadDocuments.set(conversationId, []);
        const store = threadDocuments.get(conversationId);
        for (const doc of documentsData) {
            // Avoid duplicates if the same file is re-uploaded
            if (!store.find(d => d.documentName === doc.documentName)) {
                store.push({ documentName: doc.documentName, documentText: doc.documentText });
            }
        }
        console.log(`[ThreadDocs] Stored ${documentsData.length} doc(s) for thread ${conversationId} (total: ${store.length})`);
    }

    // --- Python AI Layer: Document Summarization (Feature 3) ---
    // If total uploaded text is long, get an auto-summary and prepend it as a high-priority chunk
    if (documentsData.length > 0) {
        const combinedText = documentsData.map(d => d.documentText).join('\n\n');
        if (combinedText.length > 3000) {
            try {
                const sumRes = await axios.post(`${PYTHON_SERVICE_URL}/summarize`, {
                    text: combinedText.slice(0, 10000), // cap input to avoid overwhelming the model
                    max_length: 200
                }, { timeout: 15000 });
                if (sumRes.data.summary) {
                    console.log(`[Python AI] Auto-summary generated (${sumRes.data.summary.length} chars) for ${documentsData.length} doc(s).`);
                    // Prepend as a synthetic document so it gets indexed and ranks high
                    documentsData.unshift({
                        documentText: '[DOCUMENT SUMMARY]: ' + sumRes.data.summary,
                        documentName: 'Auto-Summary'
                    });
                }
            } catch (err) {
                console.warn('[Python AI] Summarization unavailable:', err.message);
            }
        }
    }

    // 1. Index any newly uploaded document chunks into the persistent store
    if (documentsData.length > 0) {
        const allChunks = [];
        for (const doc of documentsData) {
            const chunks = chunkText(doc.documentText);
            console.log(`[RAG] "${doc.documentName}": ${chunks.length} chunk(s)`);
            chunks.forEach((chunk, ci) =>
                allChunks.push({ text: chunk, documentName: doc.documentName, chunkIdx: ci, conversationId })
            );
        }
        await vectorStore.addChunks(allChunks);
    }

    // 1b. Collect previously uploaded documents for this thread (thread-scoped memory)
    const storedDocs = conversationId ? (threadDocuments.get(conversationId) || []) : [];

    // 2. Semantic search — gated by query router to skip trivial/casual prompts
    // --- Python AI Layer: Intent Classification (Feature 1) ---
    // Only call if NOT a trivially casual query (saves a round-trip)
    const isCasual = isCasualQuery(currentQuery);
    let intentMode = isCasual ? 'A' : null;
    if (!isCasual) {
        try {
            const intentRes = await axios.post(`${PYTHON_SERVICE_URL}/classify-intent`, { text: currentQuery }, { timeout: 5000 });
            intentMode = intentRes.data.intent_mode || 'A';
            console.log(`[Python AI] Intent classified: Mode ${intentMode} (confidence: ${intentRes.data.confidence})`);
        } catch (err) {
            intentMode = 'A'; // Default fallback
            console.warn('[Python AI] Intent classification unavailable:', err.message);
        }
    }

    const skipVectorSearch = isCasual && documentsData.length === 0 && storedDocs.length === 0;
    if (skipVectorSearch) {
        console.log('[RAG] Gatekeeper: casual/short query — skipping vector search.');
    } else if (vectorStore.hasChunks()) {
        const queryVec  = await embed(currentQuery);
        const rawRanked = await vectorStore.search(queryVec, TOP_K);

        // Thread isolation: discard chunks from other conversations.
        // Score threshold: discard chunks with cosine similarity below 0.20.
        const MIN_SIMILARITY = 0.20;
        const ranked = rawRanked
            .filter(r => !conversationId || r.conversationId === conversationId)
            .filter(r => r.score >= MIN_SIMILARITY);

        if (rawRanked.length !== ranked.length) {
            const dropped = rawRanked.length - ranked.length;
            console.log(`[RAG] Filtered out ${dropped} chunk(s) (wrong thread or below ${MIN_SIMILARITY} similarity).`);
        }

        if (ranked.length > 0) {
            retrievedChunks = ranked.map(r => ({
                source:      r.documentName,
                chunkIdx:    r.chunkIdx,
                score:       Math.round(r.score * 1000) / 1000,
                textSnippet: r.text.slice(0, 300)
            }));
            console.log('[RAG] Top chunks:', retrievedChunks
                .map(c => `${c.source}[${c.chunkIdx}]=${c.score}`).join(' | '));

            const ragBlocks    = ranked.map((c, i) =>
                `<chunk id="${i + 1}" source="${c.documentName}">
${c.text}
</chunk>`
            ).join('\n\n');
            const uploadedNote = documentsData.length > 0
                ? `Uploaded file(s): ${documentsData.map(d => `"${d.documentName}"`).join(', ')}. `
                : '';
            finalUserPrompt = `[RAG DOCUMENT RETRIEVAL]\n${uploadedNote}The ${ranked.length} most relevant passage(s) were retrieved by semantic similarity and are shown inside <chunk> tags. Answer ONLY from these passages. Do NOT invent content not present in them. Do NOT call a file "PDF" unless its name ends in .pdf.\n\n${ragBlocks}\n\nUser question: ${currentQuery}\n\nYour answer MUST be grounded solely in the retrieved passages above.`;
        }
    }

    // 2b. Re-inject full thread-stored document text when no high-scoring chunks were
    //     found but the thread has previously uploaded documents. This ensures the AI
    //     never loses access to uploaded content.
    if (retrievedChunks.length === 0 && storedDocs.length > 0) {
        const docBlocks = storedDocs.map((d, i) =>
            `<document id="${i + 1}" name="${d.documentName}">\n${d.documentText.slice(0, 6000)}\n</document>`
        ).join('\n\n');
        console.log(`[ThreadDocs] Re-injecting ${storedDocs.length} stored doc(s) into context for thread ${conversationId}`);
        finalUserPrompt = `[THREAD DOCUMENT CONTEXT]\nThe user has previously uploaded ${storedDocs.length} document(s) in this conversation: ${storedDocs.map(d => `"${d.documentName}"`).join(', ')}. Their full text is provided below.\n\n${docBlocks}\n\nUser question: ${currentQuery}\n\nAnswer using the document content above when relevant.`;
    }

    // 3. SQL events fusion — always run alongside vector search
    let eventContext = '';
    if (isEventQuery(currentQuery)) {
        // Detect status filter
        const upcomingFilter = /(upcoming|next|schedule|what.*happening|mayroon|anong|kelan|happen|future|this month|this year|january|february|march|april|may|june|july|august|september|october|november|december)/i.test(currentQuery)
            ? 'upcoming' : null;

        // Extract specific month from query (e.g. "july 2026", "events in june")
        const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
        const monthMatch = currentQuery.toLowerCase().match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i);
        const requestedMonth = monthMatch ? monthMatch[1].toLowerCase() : null;
        const yearMatch = currentQuery.match(/\b(202\d)\b/);
        const requestedYear = yearMatch ? parseInt(yearMatch[1]) : null;

        let dbData = fetchEventsAsContext(upcomingFilter);

        // Filter returned rows by month/year if user specified one
        if (dbData && requestedMonth) {
            const monthNum = String(MONTHS.indexOf(requestedMonth) + 1).padStart(2, '0');
            // Extract the event entries and filter by the month in their Date field
            const allRows = upcomingFilter
                ? db.prepare('SELECT * FROM events WHERE status = ? ORDER BY date ASC').all(upcomingFilter)
                : db.prepare('SELECT * FROM events ORDER BY date DESC').all();
            const monthRows = allRows.filter(e => {
                const datePart = String(e.date || '');
                // Match YYYY-MM or MM-DD containing the month number
                const matchesMonth = datePart.split('-')[1] === monthNum;
                const matchesYear = !requestedYear || datePart.startsWith(String(requestedYear));
                return matchesMonth && matchesYear;
            });
            if (monthRows.length > 0) {
                const monthLabel = monthMatch[1].charAt(0).toUpperCase() + monthMatch[1].slice(1);
                const yearLabel = requestedYear ? ` ${requestedYear}` : '';
                const formatted = monthRows.map(e => {
                    const logCount = db.prepare('SELECT COUNT(*) as c FROM event_logs WHERE event_id = ?').get(e.id);
                    const actualAttendees = logCount?.c || 0;
                    let entry = `- ${e.title} (${e.status.toUpperCase()})\n  Date: ${e.date}${e.time ? ' at ' + e.time : ''}\n  Category: ${e.category}\n  Location: ${e.location}\n  Description: ${e.description}`;
                    if (actualAttendees > 0) entry += `\n  Registered Attendees: ${actualAttendees}`;
                    else if (e.attendees > 0) entry += `\n  Attendees (recorded): ${e.attendees}`;
                    else entry += `\n  Attendees: 0`;
                    if (e.budget_allotted > 0) entry += `\n  Budget: PHP ${Number(e.budget_allotted).toLocaleString()}`;
                    entry += `\n  Requirements: ${e.requirements}\n  Contact: ${e.contact}`;
                    return entry;
                }).join('\n\n');
                dbData = `SK Events Database — ${monthLabel}${yearLabel} (Barangay Concepcion Dos):\n\n${formatted}\n\nIMPORTANT: The above is ALL events for ${monthLabel}${yearLabel}. Do NOT add, invent, or mention any event not listed above.`;
            } else {
                dbData = null; // trigger "no events" message below
                eventContext = `\n\n[DATABASE: EVENTS]\nThere are NO events recorded in the database for ${requestedMonth.charAt(0).toUpperCase() + requestedMonth.slice(1)}${requestedYear ? ' ' + requestedYear : ''}. DO NOT hallucinate or mention any fictional events. Tell the user clearly that no events are scheduled for that month.\n[END DATABASE]`;
                console.log('[aSK Youth] Event context injected from DB (EMPTY for month) —', requestedMonth, requestedYear);
            }
        }

        if (dbData && !eventContext) {
            eventContext = `\n\n[DATABASE: EVENTS]\nThe following is LIVE, AUTHORITATIVE data from the SK Concepcion Dos events database. Use it as the SOLE source of truth for any event-related answers. Do not invent event details. You MUST strictly limit your response to ONLY the events provided below. DO NOT use your pre-trained knowledge to mention any generic, external, or hallucinated events. If the user asks for events in a specific month, only list the ones from this block that match.\n\n${dbData}\n[END DATABASE]`;
            console.log('[aSK Youth] Event context injected from DB —', requestedMonth || upcomingFilter || 'all', 'events.');
        } else if (!eventContext) {
            eventContext = `\n\n[DATABASE: EVENTS]\nThere are currently NO ${upcomingFilter ? 'upcoming ' : ''}events scheduled or recorded in the database. DO NOT hallucinate, invent, or mention any fictional events. Clearly state to the user that there are no events in the database.\n[END DATABASE]`;
            console.log('[aSK Youth] Event context injected from DB (EMPTY) —', upcomingFilter || 'all', 'events.');
        }
    }

    // --- Append Python AI Layer flags to the final prompt ---
    // Intent mode flag (A=Casual, B=Professional, C=Document Analysis)
    if (intentMode && intentMode !== 'A') {
        finalUserPrompt += `\n\n[Response Mode: ${intentMode}]`;
    }
    // Language flag (Filipino/Tagalog detection)
    if (languageFlag) {
        finalUserPrompt += languageFlag;
    }

    return { finalUserPrompt, eventContext, retrievedChunks };
}
// ---------------------------------------------------------------------------

app.post('/api/chat', upload.array('files', MAX_FILES), async (req, res) => {
    try {
        console.log('\n--- INCOMING CHAT REQUEST ---');
        console.log('Body:', req.body.messages ? `messages present (${typeof req.body.messages})` : JSON.stringify(req.body));
        const filesArr = req.files || [];
        console.log('Files:', filesArr.length > 0 ? filesArr.map(f => f.originalname).join(', ') : 'NONE');
        if (filesArr.length > 0) {
            filesArr.forEach(f => console.log('[debug] file:', { originalname: f.originalname, mimetype: f.mimetype, size: f.size }));
        }

        const messages = typeof req.body.messages === 'string'
            ? JSON.parse(req.body.messages)
            : req.body.messages;
        if (!messages) return res.status(400).json({ error: "Invalid payload." });
        console.log("Incoming inference request...");

        // Extract document text from all attached files (up to 5).
        // Each entry: { documentText, documentName }
        const documentsData = [];
        for (const file of filesArr) {
            try {
                console.log(`[aSK Youth] Extracting text from: ${file.originalname} (${file.mimetype})`);
                const extracted = await extractTextFromFile(file.buffer, file.mimetype, file.originalname);
                console.log(`Extracted Text Length (${file.originalname}):`, extracted.length);
                documentsData.push({
                    documentText: extracted,
                    documentName: file.originalname
                });
            } catch (extractErr) {
                console.error(`[aSK Youth] File extraction failed for ${file.originalname}:`, extractErr.message);
            }
        }

        // Filter out initial system-mock
        let validMessages = messages.slice(0, -1).filter((msg, index) => {
            if (index === 0 && msg.role === 'assistant' && msg.content.toLowerCase().includes("initialized")) return false;
            return true;
        });

        const currentQuery = messages[messages.length - 1].content;
        
        const activeRole = resolveActiveRole(req);
        const compressedRoleHistory = await compressChatHistory(validMessages);
        let chatHistoryArr = compressedRoleHistory.map(msg => {
            if (msg.role === 'assistant') {
                const cleanContent = msg.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
                return { type: 'model', response: [cleanContent || msg.content] };
            }
            return { type: 'user', text: msg.content };
        });

        // Fused retrieval: persistent HNSW vector search + SQL events query
        const conversationId = req.body.conversationId || null;
        const { finalUserPrompt, eventContext, retrievedChunks } =
            await buildRagContext(currentQuery, documentsData, conversationId);

        const clientDateString = req.body.clientDateString || null;
        const fullSystemPrompt = buildFullSystemPrompt(eventContext, activeRole, clientDateString);
        console.log("Final Prompt sent to LLM:", finalUserPrompt.substring(0, 200) + "...");

        try {
            let rawReply = await generateResponse(
                fullSystemPrompt,
                finalUserPrompt,
                compressedRoleHistory,
                { temperature: 0.7, maxTokens: 2048 },
                (text) => process.stdout.write(text)
            );
            console.log("\n[Generation Complete]");

            let finalReply = String(rawReply).trim();
            const { finalReply: processed, toolUsed } = await postProcessAIResponse(finalReply, {
                fullSystemPrompt,
                chatHistoryArr: compressedRoleHistory,
                userPrompt: finalUserPrompt,
            });
            finalReply = processed;
            if (toolUsed) console.log('[Python Tools] Tool executed:', toolUsed);

            if (process.env.GRAMMAR_ENFORCEMENT === 'true') {
                console.log("[aSK Youth] GRAMMAR_ENFORCEMENT is ON. Initiating rewrite pass...");
                let thinkBlock = "";
                let originalMessage = finalReply;
                const thinkMatch = originalMessage.match(/<think>[\s\S]*?<\/think>/);
                if (thinkMatch) {
                    thinkBlock = thinkMatch[0];
                    originalMessage = originalMessage.replace(/<think>[\s\S]*?<\/think>/, '').trim();
                }
                if (originalMessage) {
                    try {
                        const rewrittenBody = await generateResponse(
                            rewriterPrompt,
                            JSON.stringify({ user_language: "en", original_message: originalMessage }),
                            [],
                            { temperature: 0.3, maxTokens: 512 }
                        );
                        console.log("[Rewrite Complete]");
                        finalReply = (thinkBlock ? thinkBlock + "\n\n" : "") + String(rewrittenBody).trim();
                    } catch (rewriteErr) {
                        console.error('Rewriter hit an error, returning original safely:', rewriteErr);
                    }
                }
            }

            res.json({
                status: "success",
                node_message: "Cloud API Fallback Complete.",
                ai_data: { ai_message: finalReply },
                documents: documentsData.length > 0
                    ? documentsData.map(d => ({ extractedText: d.documentText.slice(0, 4000), documentName: d.documentName }))
                    : null,
                retrievedChunks: retrievedChunks.length > 0 ? retrievedChunks : undefined
            });
        } catch (error) {
            throw error;
        }

    } catch (error) {
        console.error('Inference Error Caught Safely:', error);
        res.status(500).json({ status: "error", message: error.message || String(error) });
    }
});

// ---------------------------------------------------------------------------
// SSE Streaming endpoint  POST /api/chat/stream
// Streams LLM tokens via Server-Sent Events so the frontend can render
// partial responses in real-time.  Keeps /api/chat intact for compatibility.
// SSE event types:
//   { type: 'phase',     phase: string, message: string }
//   { type: 'retrieved', chunks: retrievedChunks[] }
//   { type: 'token',     token: string }
//   { type: 'done',      ai_data, documents, retrievedChunks }
//   { type: 'error',     message: string }
// ---------------------------------------------------------------------------
app.post('/api/chat/stream', upload.array('files', MAX_FILES), async (req, res) => {
    // Set SSE headers before anything else
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx/proxy buffering
    res.flushHeaders();

    // Disable Nagle's algorithm so each write is sent immediately.
    // Without this, the OS may batch small SSE events and delay delivery.
    if (res.socket) {
        res.socket.setNoDelay(true);
        res.socket.setTimeout(0); // disable idle socket timeout
    }

    let aborted = false;
    // Use res.on('close') NOT req.on('close'). The req close fires as soon as the
    // request body is fully consumed by express.json() — long before the client
    // disconnects from the SSE stream. res.on('close') fires only when the client
    // genuinely closes the response connection.
    res.on('close', () => {
        console.log('[SSE] res.close fired — client disconnected');
        aborted = true;
    });

    // Keepalive: send a comment every 15 s to prevent proxy/browser timeouts.
    const keepAlive = setInterval(() => {
        if (aborted || res.writableEnded) return clearInterval(keepAlive);
        try { res.write(': keepalive\n\n'); } catch (_) {}
    }, 15000);

    const sendEvent = (data) => {
        if (!aborted && !res.writableEnded) {
            try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch (e) { console.error('[SSE] write error:', e.message); }
        }
    };

    let genLockAcquired = false;
    try {
        const messages = typeof req.body.messages === 'string'
            ? JSON.parse(req.body.messages)
            : req.body.messages;
        if (!messages) { sendEvent({ type: 'error', message: 'Invalid payload.' }); return res.end(); }
        if (!context)  { sendEvent({ type: 'error', message: 'Model still loading.' }); return res.end(); }

        const filesArr = req.files || [];

        // Extract text from uploaded files
        const documentsData = [];
        for (const file of filesArr) {
            try {
                const extracted = await extractTextFromFile(file.buffer, file.mimetype, file.originalname);
                documentsData.push({ documentText: extracted, documentName: file.originalname });
            } catch (e) {
                console.error(`[SSE] File extraction failed for ${file.originalname}:`, e.message);
            }
        }

        const currentQuery = messages[messages.length - 1].content;

        // Phase 1: Indexing & retrieval
        if (documentsData.length > 0) {
            sendEvent({ type: 'phase', phase: 'INDEXING_DOCUMENTS', message: 'Processing uploaded documents...' });
        } else {
            sendEvent({ type: 'phase', phase: 'RETRIEVING_CONTEXT', message: 'Searching knowledge base...' });
        }

        const conversationId = req.body.conversationId || null;
        const { finalUserPrompt, eventContext, retrievedChunks } =
            await buildRagContext(currentQuery, documentsData, conversationId);

        if (retrievedChunks.length > 0) {
            sendEvent({ type: 'retrieved', chunks: retrievedChunks });
        }

        // Build history (same logic as /api/chat)
        const validMessages = messages.slice(0, -1).filter((msg, index) => {
            if (index === 0 && msg.role === 'assistant' && msg.content.toLowerCase().includes("initialized")) return false;
            return true;
        });
        const activeRole = resolveActiveRole(req);
        const compressedRoleHistory = await compressChatHistory(validMessages);
        const chatHistoryArr = compressedRoleHistory.map(msg => {
            if (msg.role === 'assistant') {
                const cleanContent = msg.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
                return { type: 'model', response: [cleanContent || msg.content] };
            }
            return { type: 'user', text: msg.content };
        });

        const clientDateString = req.body.clientDateString || null;
        const fullSystemPrompt = buildFullSystemPrompt(eventContext, activeRole, clientDateString);

        // Phase 2: Generating (streaming tokens via onToken → SSE)
        sendEvent({ type: 'phase', phase: 'GENERATING', message: 'Generating response...' });

        try {
            let streamBuf = '';
            let activeTag = null; // null | 'think' | 'TOOL'

            const rawReply = await generateResponse(
                fullSystemPrompt,
                finalUserPrompt,
                compressedRoleHistory,
                { temperature: 0.7, maxTokens: 2048 },
                (text) => {
                    process.stdout.write(text);
                    streamBuf += text;

                    let loop = true;
                    while (loop) {
                        loop = false;
                        if (activeTag) {
                            const closeStr = `</${activeTag}>`;
                            const closeIdx = streamBuf.indexOf(closeStr);
                            if (closeIdx !== -1) {
                                streamBuf = streamBuf.slice(closeIdx + closeStr.length);
                                activeTag = null;
                                loop = true;
                            }
                        } else {
                            const thinkIdx = streamBuf.indexOf('<think>');
                            const toolIdx = streamBuf.indexOf('<TOOL>');
                            
                            let firstIdx = -1;
                            let firstTag = null;
                            
                            if (thinkIdx !== -1 && toolIdx !== -1) {
                                if (thinkIdx < toolIdx) { firstIdx = thinkIdx; firstTag = 'think'; }
                                else { firstIdx = toolIdx; firstTag = 'TOOL'; }
                            } else if (thinkIdx !== -1) {
                                firstIdx = thinkIdx; firstTag = 'think';
                            } else if (toolIdx !== -1) {
                                firstIdx = toolIdx; firstTag = 'TOOL';
                            }

                            if (firstIdx !== -1) {
                                const before = streamBuf.slice(0, firstIdx);
                                if (before) sendEvent({ type: 'token', token: before });
                                streamBuf = streamBuf.slice(firstIdx + `<${firstTag}>`.length);
                                activeTag = firstTag;
                                loop = true;
                            } else {
                                const safe = streamBuf.length > 7 ? streamBuf.length - 7 : 0;
                                if (safe > 0) {
                                    sendEvent({ type: 'token', token: streamBuf.slice(0, safe) });
                                    streamBuf = streamBuf.slice(safe);
                                }
                            }
                        }
                    }
                },
                (phase, message) => {
                    sendEvent({ type: 'phase', phase, message });
                }
            );

            if (!activeTag && streamBuf) sendEvent({ type: 'token', token: streamBuf });
            console.log('\n[SSE Generation Complete]');

            let finalReply = String(rawReply).replace(/<think>[\s\S]*?<\/think>/g, '').trim();
            const { finalReply: processed, toolUsed } = await postProcessAIResponse(finalReply, {
                fullSystemPrompt,
                chatHistoryArr: compressedRoleHistory,
                userPrompt: finalUserPrompt,
                onToken: (text) => sendEvent({ type: 'token', token: text })
            });
            finalReply = processed;
            if (toolUsed) console.log('[SSE Python Tools] Tool executed:', toolUsed);
            
            sendEvent({
                type: 'done',
                ai_data: { ai_message: finalReply },
                documents: documentsData.length > 0
                    ? documentsData.map(d => ({ extractedText: d.documentText.slice(0, 4000), documentName: d.documentName }))
                    : null,
                retrievedChunks: retrievedChunks.length > 0 ? retrievedChunks : []
            });
        } catch (error) {
            throw error;
        }
    } catch (error) {
        console.error('[SSE] Error:', error);
        sendEvent({ type: 'error', message: error.message || String(error) });
    }
    clearInterval(keepAlive);
    res.end();
});

// ---------------------------------------------------------------------------
// Markdown stripping helper for plain AI reply exports (Phase 5)
// ---------------------------------------------------------------------------
function stripMarkdown(text) {
    return text
        .replace(/#{1,6}\s?/g, '')           // headers
        .replace(/\*\*(.*?)\*\*/g, '$1')     // bold
        .replace(/\*(.*?)\*/g, '$1')         // italic
        .replace(/`{1,3}[^`]*`{1,3}/g, '')  // code
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
        .trim();
}

// ---------------------------------------------------------------------------
// Document Export endpoint  POST /api/export/document
// Generates an official SK letterhead PDF or DOCX from AI-drafted content.
// Payload: { title: string, content: string, format: "pdf" | "docx" }
// ---------------------------------------------------------------------------
app.post('/api/export/document', async (req, res) => {
    const { title, content, format, isPlainReply } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'title is required and must be a non-empty string.' });
    }
    if (typeof content !== 'string') {
        return res.status(400).json({ error: 'content is required and must be a string.' });
    }
    if (!format || !['pdf', 'docx'].includes(format)) {
        return res.status(400).json({ error: 'format must be "pdf" or "docx".' });
    }

    const safeTitle   = title.trim();
    const safeContent = content.trim();
    const processedContent = isPlainReply === true
        ? stripMarkdown(safeContent) + '\n\n---\nGenerated by aSK Youth AI Assistant\nBarangay Concepcion Dos, Marikina City'
        : safeContent;
    const fileBase    = safeTitle.replace(/[^a-z0-9\s]/gi, '').trim().replace(/\s+/g, '_') || 'document';

    const LETTERHEAD = [
        'Republic of the Philippines',
        'City of Marikina',
        'Barangay Concepcion Dos',
        'OFFICE OF THE SANGGUNIANG KABATAAN'
    ];

    try {
        if (format === 'docx') {
            const doc = new Document({
                sections: [{
                    children: [
                        // Letterhead — centered; SK office line in bold
                        ...LETTERHEAD.map(line => new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({
                                text: line,
                                bold: line === 'OFFICE OF THE SANGGUNIANG KABATAAN',
                                size: 24   // 12pt (half-point units)
                            })]
                        })),
                        new Paragraph({ text: '' }),
                        // Document title — bold, centered, slightly larger
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: safeTitle, bold: true, size: 26 })]
                        }),
                        new Paragraph({ text: '' }),
                        // Content — each line becomes its own paragraph to preserve structure
                        ...processedContent.split('\n').map(line =>
                            new Paragraph({ children: [new TextRun({ text: line, size: 24 })] })
                        )
                    ]
                }]
            });

            const buffer = await Packer.toBuffer(doc);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${fileBase}.docx"`);
            return res.send(buffer);
        }

        // format === 'pdf'
        const pdfDoc = new PDFDocument({ margin: 72, size: 'LETTER' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileBase}.pdf"`);
        pdfDoc.pipe(res);

        // Letterhead block
        pdfDoc.fontSize(12).font('Helvetica');
        for (const line of LETTERHEAD) {
            if (line === 'OFFICE OF THE SANGGUNIANG KABATAAN') {
                pdfDoc.font('Helvetica-Bold').text(line, { align: 'center' });
                pdfDoc.font('Helvetica');
            } else {
                pdfDoc.text(line, { align: 'center' });
            }
        }

        pdfDoc.moveDown();
        // Document title — bold, slightly larger
        pdfDoc.fontSize(13).font('Helvetica-Bold').text(safeTitle, { align: 'center' });
        pdfDoc.font('Helvetica').fontSize(12);
        pdfDoc.moveDown();
        // Content body
        pdfDoc.text(processedContent, { align: 'left', lineGap: 4 });
        pdfDoc.end();

    } catch (err) {
        console.error('[Export] Document generation error:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Document generation failed: ' + err.message });
        }
    }
});

// Multer / general middleware error handler
app.use((err, _req, res, _next) => {
    console.error('[Express Error]', err.message);
    res.status(err.status || 400).json({ error: err.message || 'Request error.' });
});

// ---------------------------------------------------------------------------
// Phase 2: Template-Based Document Generation (Feature 7) — proxy to Python
// ---------------------------------------------------------------------------
app.post('/api/generate-document', async (req, res) => {
    const { template_id, data, format } = req.body;
    const VALID_TEMPLATES = ['resolution', 'minutes', 'certificate'];
    const VALID_FORMATS   = ['docx', 'pdf'];
    if (!template_id || !VALID_TEMPLATES.includes(template_id)) {
        return res.status(400).json({ error: `template_id must be one of: ${VALID_TEMPLATES.join(', ')}` });
    }
    if (format && !VALID_FORMATS.includes(format)) {
        return res.status(400).json({ error: `format must be one of: ${VALID_FORMATS.join(', ')}` });
    }
    try {
        const pyRes = await axios.post(`${PYTHON_SERVICE_URL}/generate-document`, req.body, {
            responseType: 'stream',
            timeout: 30000
        });
        res.setHeader('Content-Type', pyRes.headers['content-type']);
        res.setHeader('Content-Disposition', pyRes.headers['content-disposition'] || 'attachment');
        pyRes.data.pipe(res);
    } catch (err) {
        console.error('[DocGen] Proxy error:', err.message);
        if (!res.headersSent) {
            const status = err.response?.status || 500;
            res.status(status).json({ error: err.response?.data?.detail || err.message });
        }
    }
});

// ---------------------------------------------------------------------------
// Phase 2: Events Analytics Dashboard (Feature 5) — proxy to Python
// ---------------------------------------------------------------------------
app.get('/api/analytics/events', async (req, res) => {
    const type = req.query.type || 'category';
    const VALID_TYPES = ['category', 'monthly', 'status', 'event', 'attendance'];
    if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
    }
    try {
        const params = { type };
        if (req.query.show_gender) params.show_gender = req.query.show_gender;
        if (req.query.show_staff) params.show_staff = req.query.show_staff;
        const pyRes = await axios.get(`${PYTHON_SERVICE_URL}/analytics/events`, {
            params,
            timeout: 15000
        });
        res.json(pyRes.data);
    } catch (err) {
        console.error('[Analytics] Proxy error:', err.message);
        const status = err.response?.status || 500;
        res.status(status).json({ error: err.response?.data?.detail || err.message });
    }
});

// ---------------------------------------------------------------------------
// Conversation management endpoints
// ---------------------------------------------------------------------------

// Register or upsert a conversation (called internally or from frontend on create)
app.post('/conversations', (req, res) => {
    const { id, title = 'New Chat' } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required' });
    if (!conversations.has(id)) {
        conversations.set(id, { id, title, pinned: false, createdAt: Date.now() });
    }
    res.json(conversations.get(id));
});

// Rename a conversation
app.patch('/conversations/:id/rename', (req, res) => {
    const { id } = req.params;
    const { title } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });
    if (!conversations.has(id)) {
        // Auto-create if the frontend never explicitly registered it
        conversations.set(id, { id, title: title.trim(), pinned: false, createdAt: Date.now() });
    } else {
        conversations.get(id).title = title.trim();
    }
    res.json(conversations.get(id));
});

// Toggle pinned state of a conversation
app.patch('/conversations/:id/pin', (req, res) => {
    const { id } = req.params;
    if (!conversations.has(id)) {
        conversations.set(id, { id, title: 'New Chat', pinned: true, createdAt: Date.now() });
    } else {
        const conv = conversations.get(id);
        conv.pinned = !conv.pinned;
    }
    res.json(conversations.get(id));
});

// Delete a conversation
app.delete('/conversations/:id', (req, res) => {
    const { id } = req.params;
    if (!conversations.has(id)) return res.status(404).json({ error: 'Conversation not found' });
    conversations.delete(id);
    threadDocuments.delete(id); // Clean up thread-scoped document store
    res.json({ success: true, id });
});

// ---------------------------------------------------------------------------
app.listen(PORT, () => console.log(`Stable Cloud AI Fallback Engine running on http://localhost:${PORT}`));
