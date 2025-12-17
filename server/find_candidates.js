const { query } = require('./config/db');
const fs = require('fs');

async function findCandidates() {
    try {
        const res = await query(`
            SELECT id, case_number, funeral_date, service_date 
            FROM cases 
            WHERE funeral_time IS NULL 
              AND service_time IS NULL 
              AND (funeral_date IS NOT NULL OR service_date IS NOT NULL)
            ORDER BY created_at DESC
        `);
        fs.writeFileSync('candidates_utf8.json', JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

findCandidates();
