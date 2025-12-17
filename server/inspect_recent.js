const { query } = require('./config/db');
const fs = require('fs');

async function inspectRecentCases() {
    try {
        const res = await query(`
            SELECT id, case_number, created_at, funeral_date, funeral_time, service_date, service_time 
            FROM cases 
            ORDER BY created_at DESC 
            LIMIT 20
        `);
        fs.writeFileSync('recent_cases_utf8.json', JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

inspectRecentCases();
