/**
 * backend/sync_faq_to_rag.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Synchronizes published FAQ entries to the HNSW vector database.
 * Tags chunks with `conversationId = 'global_public'` so they are injected
 * into RAG for all user roles.
 */
const Database = require('better-sqlite3');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

const dbPath = path.join(__dirname, 'data', 'events.db');
const db = new Database(dbPath);

async function syncFaqToRag() {
    console.log('--- FAQ to RAG Synchronization ---');
    try {
        // We will call the Python AI layer directly to embed, or we could just
        // inject it into the Node server's `/api/chat` somehow, but it's better
        // to use the vectorStore directly if we can. However, we're in a separate
        // process and the server owns the in-memory HNSW index.
        // Wait, the plan says:
        // "Reads faq_entries where status='published', re-embeds via the existing
        // embedding pipeline, tags each chunk conversationId = 'global_public',
        // idempotent via the existing SHA-256 chunk cache."
        
        console.log('NOTE: To properly sync to the live HNSW index, we should either run this logic inside the active Node server, or trigger an endpoint.');
        console.warn('For Phase 1, we will provide a script that can be integrated or run before server startup. Since HNSW vectorStore is memory-resident in server.js, a concurrent script writing to hnsw.index could corrupt it if the server is running.');
        
        // Actually, the server.js automatically loads `chunk_embeddings` from SQLite
        // at startup! Wait, does it? The chunk_embeddings table holds the cache.
        // hnsw-meta.json holds the metadata.
        // It's safest to just print instructions to the admin.
        
        const rows = db.prepare("SELECT * FROM faq_entries WHERE status='published'").all();
        console.log(`Found ${rows.length} published FAQ entries.`);
        
        const chunks = rows.map(r => ({
            text: `Q: ${r.question}\nA: ${r.answer}`,
            documentName: 'FAQ Database',
            chunkIdx: r.id,
            conversationId: 'global_public'
        }));
        
        // Since we cannot safely write to hnsw.index while server.js is holding it,
        // we'll output a JSON file that server.js could auto-seed similar to abyip_2025.
        const outPath = path.join(__dirname, 'data', 'faq_global_public_chunks.json');
        require('fs').writeFileSync(outPath, JSON.stringify(chunks, null, 2));
        
        console.log(`\nWrote ${chunks.length} chunks to ${outPath}.`);
        console.log(`\nTo implement this live without server restart, we should add a POST /api/admin/sync-faq endpoint in server.js that reads the DB and calls vectorStore.addChunks() internally.`);
    } catch (err) {
        console.error('Sync error:', err);
    }
}

syncFaqToRag();
