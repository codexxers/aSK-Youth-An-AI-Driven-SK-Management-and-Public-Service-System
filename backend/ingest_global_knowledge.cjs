const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const axios = require('axios');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, 'data');
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';

const db = new Database(path.join(DATA_DIR, 'events.db'));

let HierarchicalNSW = null;
try {
    HierarchicalNSW = require('hnswlib-node').HierarchicalNSW;
} catch (e) {
    console.warn('[VectorStore] hnswlib-node unavailable, brute-force cosine fallback active:', e.message);
}

function computeHash(text) {
    return createHash('sha256').update(text).digest('hex');
}

async function embedBatch(texts, batchSize = 8) {
    try {
        const res = await axios.post(`${PYTHON_SERVICE_URL}/embed`, { texts }, { timeout: 30000 });
        console.log(`[RAG] Python batch embed: ${texts.length} text(s) embedded successfully.`);
        return res.data.embeddings;
    } catch (err) {
        console.warn('[RAG] Python batch embed unavailable, falling back to Xenova:', err.message);
        const { pipeline } = await import('@xenova/transformers');
        const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
            cache_dir: path.join(__dirname, '..', '.cache', 'xenova')
        });
        const results = [];
        for (let i = 0; i < texts.length; i += batchSize) {
            const slice = texts.slice(i, i + batchSize);
            const vecs = await Promise.all(slice.map(async t => {
                const out = await extractor(t, { pooling: 'mean', normalize: true });
                return Array.from(out.data);
            }));
            results.push(...vecs);
        }
        return results;
    }
}

class HNSWVectorStore {
    constructor(dataDir, dim = 384, maxElements = 100000) {
        this.dataDir     = dataDir;
        this.dim         = dim;
        this.maxElements = maxElements;
        this.indexPath   = path.join(dataDir, 'hnsw.index');
        this.metaPath    = path.join(dataDir, 'hnsw-meta.json');
        this.index       = null;
        this.metadata    = new Map();
        this.hashToId    = new Map();
        this.bruteVecs   = new Map();
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
                console.error('[VectorStore] HNSW init error:', e.message);
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
                
                const rows = db.prepare('SELECT hash, vector FROM chunk_embeddings').all();
                for (const r of rows) {
                    const id = this.hashToId.get(r.hash);
                    if (id !== undefined) {
                        this.bruteVecs.set(id, Array.from(new Float32Array(r.vector.buffer)));
                    }
                }
            } catch (e) {
                console.error('[VectorStore] Brute-force init error:', e.message);
            }
        }
    }

    async _save() {
        if (this.hnswOk && this.index) {
            this.index.writeIndex(this.indexPath);
        }
        const state = {
            chunks:   Array.from(this.metadata.entries()),
            hashToId: Array.from(this.hashToId.entries()),
            nextId:   this.nextId
        };
        fs.writeFileSync(this.metaPath, JSON.stringify(state));
    }

    async addChunks(chunks) {
        if (chunks.length === 0) return;

        const toProcess  = [];
        const cachedVecs = new Map();
        let cacheHits    = 0;

        for (const chunk of chunks) {
            chunk.hash = chunk.hash || computeHash(chunk.text);
            const row = db.prepare('SELECT vector FROM chunk_embeddings WHERE hash = ?').get(chunk.hash);
            if (row) {
                const arr = Array.from(new Float32Array(row.vector.buffer));
                cachedVecs.set(chunk.hash, arr);
                cacheHits++;
            }
            if (!this.hashToId.has(chunk.hash)) {
                toProcess.push(chunk);
            }
        }

        console.log(`[VectorStore] Checking ${chunks.length} chunks: ${cacheHits} DB cache hits, ${toProcess.length} need indexing.`);
        if (toProcess.length === 0) return;

        const uncached = toProcess.filter(c => !cachedVecs.has(c.hash));
        if (uncached.length > 0) {
            console.log(`[VectorStore] Embedding ${uncached.length} new chunk(s)...`);
            const vecs = await embedBatch(uncached.map(c => c.text));
            const ins  = db.prepare('INSERT OR IGNORE INTO chunk_embeddings (hash, vector) VALUES (?, ?)');
            db.transaction(rows => { for (const r of rows) ins.run(r.hash, r.vec); })(
                uncached.map((c, i) => ({ hash: c.hash, vec: Buffer.from(Float32Array.from(vecs[i]).buffer) }))
            );
            uncached.forEach((c, i) => cachedVecs.set(c.hash, vecs[i]));
        }

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

        await this._save();
    }
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: node ingest_global_knowledge.cjs <json_file_path> <source_tag>');
        process.exit(1);
    }

    const [jsonFilePath, sourceTag] = args;
    const absJsonPath = path.resolve(jsonFilePath);

    if (!fs.existsSync(absJsonPath)) {
        console.error(`Error: File not found - ${absJsonPath}`);
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(absJsonPath, 'utf8'));
    if (!Array.isArray(data)) {
        console.error('Error: JSON file must contain an array of strings.');
        process.exit(1);
    }

    console.log(`Starting ingestion of ${data.length} chunks from ${sourceTag}...`);

    const vectorStore = new HNSWVectorStore(DATA_DIR);
    await vectorStore.init();

    const GLOBAL_ADMIN_SCOPE = 'global_admin';
    const chunksToInsert = data.map((text, index) => ({
        text: text,
        documentName: sourceTag,
        chunkIdx: index,
        conversationId: GLOBAL_ADMIN_SCOPE
    }));

    await vectorStore.addChunks(chunksToInsert);
    console.log(`Ingestion complete for ${sourceTag}.`);
}

main().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
