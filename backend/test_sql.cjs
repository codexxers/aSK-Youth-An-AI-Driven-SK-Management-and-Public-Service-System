const db = require('better-sqlite3')('data/events.db'); 
console.log(db.prepare(`
    SELECT el.id, el.first_name, el.mi, el.last_name, el.suffix, 
    COALESCE(NULL, el.first_name || ' ' || COALESCE(el.mi || ' ', '') || el.last_name || COALESCE(' ' || el.suffix, '')) as userName 
    FROM event_logs el WHERE el.user_id IS NULL
`).all());
