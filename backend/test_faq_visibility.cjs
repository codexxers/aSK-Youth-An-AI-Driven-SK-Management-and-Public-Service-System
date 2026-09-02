const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'events.db');
const db = new Database(dbPath);

console.log('--- Database Verification ---');
const faqs = db.prepare('SELECT id, question, visibility, status FROM faq_entries').all();
const publicCount = faqs.filter(f => f.visibility === 'public').length;
const restrictedCount = faqs.filter(f => f.visibility === 'restricted').length;

console.log(`Total FAQs: ${faqs.length}`);
console.log(`Public: ${publicCount}`);
console.log(`Restricted: ${restrictedCount}`);

console.log('\nRestricted Entries:');
faqs.filter(f => f.visibility === 'restricted').forEach(f => console.log(`- [${f.status}] ${f.question}`));

console.log('\nPublic Entries:');
faqs.filter(f => f.visibility === 'public').forEach(f => console.log(`- [${f.status}] ${f.question}`));

if (restrictedCount < 2) {
    console.error('ERROR: Missing restricted entries.');
    process.exit(1);
}

if (publicCount < 4) {
    console.error('ERROR: Missing public entries.');
    process.exit(1);
}

console.log('\n--- Sync Script Verification ---');
try {
    require('./sync_faq_to_rag.cjs');
    const outPath = path.join(__dirname, 'data', 'faq_global_public_chunks.json');
    const chunks = require(outPath);
    const globalAdminChunks = chunks.filter(c => c.conversationId === 'global_admin');
    const globalPublicChunks = chunks.filter(c => c.conversationId === 'global_public');
    
    console.log(`\nRAG Chunks: ${chunks.length}`);
    console.log(`global_admin (Restricted): ${globalAdminChunks.length}`);
    console.log(`global_public (Public): ${globalPublicChunks.length}`);
    
    if (globalAdminChunks.length !== restrictedCount) {
        console.error('ERROR: RAG sync chunk count mismatch for restricted entries.');
        process.exit(1);
    }
} catch (e) {
    console.error('Sync verification failed:', e.message);
    process.exit(1);
}

console.log('\nALL VERIFICATIONS PASSED.');
