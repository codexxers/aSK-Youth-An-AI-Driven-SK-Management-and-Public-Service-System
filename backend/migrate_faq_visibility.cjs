/**
 * migrate_faq_visibility.cjs
 * Adds the 'visibility' column to faq_entries, reclassifies specific existing 
 * entries to 'restricted', and seeds new public and restricted entries.
 */
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'events.db');
const db = new Database(dbPath);

console.log('--- FAQ Visibility Migration ---');

try {
    // 1. Add visibility column
    const cols = db.pragma('table_info(faq_entries)').map(c => c.name);
    if (!cols.includes('visibility')) {
        db.exec("ALTER TABLE faq_entries ADD COLUMN visibility TEXT DEFAULT 'public' CHECK(visibility IN ('public', 'restricted'));");
        console.log('[Migration] Added visibility column to faq_entries.');
    } else {
        console.log('[Migration] visibility column already exists.');
    }

    // 2. Reclassify existing entries to restricted
    const updateVisibility = db.prepare("UPDATE faq_entries SET visibility = 'restricted' WHERE question = ?");
    let changes = 0;
    changes += updateVisibility.run('What is the ABYIP?').changes;
    changes += updateVisibility.run('Can I ask the AI about past SK programs and budgets?').changes;
    console.log(`[Migration] Reclassified ${changes} existing FAQ entries to restricted.`);

    // 3. Reword specific entry
    const updateAnswer = db.prepare("UPDATE faq_entries SET answer = ? WHERE question = ?");
    const newAnswer = 'Ask the AI Assistant: "What are the upcoming SK events?" It will display real-time event information from our official database. Registered youth can also see events directly from their dashboard.';
    const rewordResult = updateAnswer.run(newAnswer, 'How do I view upcoming SK events?');
    if (rewordResult.changes > 0) {
        console.log('[Migration] Reworded "How do I view upcoming SK events?".');
    }

    // 4. Seed new entries
    const insertFaq = db.prepare('INSERT INTO faq_entries (question, answer, category, display_order, status, visibility) VALUES (?, ?, ?, ?, ?, ?)');
    
    // Check if new entries already exist to avoid duplicates
    const checkExists = db.prepare('SELECT COUNT(*) as c FROM faq_entries WHERE question = ?');
    
    const newEntries = [
        // Public
        { q: "What is the Sangguniang Kabataan (SK)?", a: "The Sangguniang Kabataan (SK) is the youth council in each barangay in the Philippines. It represents the youth, creates programs for development, and gives young people a voice in local governance.", cat: 'general', v: 'public', order: 9 },
        { q: "Is aSK//YOUTH AI free to use?", a: "Yes! The aSK//YOUTH AI platform is completely free to use for all youth constituents and guests of Barangay Concepcion Dos.", cat: 'general', v: 'public', order: 10 },
        { q: "Can I chat with the assistant in Filipino?", a: "Yes, you can! The AI Assistant is bilingual and can understand and respond in both English and Filipino/Tagalog.", cat: 'general', v: 'public', order: 11 },
        { q: "How do I contact the SK office directly?", a: "You can visit the SK Hall at the Barangay Concepcion Dos center, or use the 'Suggestions' feature to send a direct message. For urgent matters, please refer to the official contact numbers posted on the barangay bulletin.", cat: 'general', v: 'public', order: 12 },
        
        // Restricted
        { q: "How do I add or edit an FAQ entry?", a: "Log in with an Admin, Chairman, or Officer account. Navigate to the FAQ module in the sidebar. Click '+ New FAQ' to add an entry, or 'Edit' on an existing one. You can set the visibility to 'public' (visible to everyone) or 'restricted' (visible only to officers and admins).", cat: 'system', v: 'restricted', order: 101 },
        { q: "How do I manage event categories, including 'Others'?", a: "When creating or editing an event, select the category from the dropdown. If you select 'Others', a new field will appear allowing you to specify a custom category label (e.g., 'Relief Operation').", cat: 'events', v: 'restricted', order: 102 }
    ];

    let inserted = 0;
    db.transaction(() => {
        for (const entry of newEntries) {
            if (checkExists.get(entry.q).c === 0) {
                insertFaq.run(entry.q, entry.a, entry.cat, entry.order, 'published', entry.v);
                inserted++;
            }
        }
    })();
    console.log(`[Migration] Seeded ${inserted} new FAQ entries.`);

    console.log('--- FAQ Visibility Migration Complete ---');
} catch (e) {
    console.error('Migration failed:', e);
}
