const { query } = require('./config/db');
const fs = require('fs');

async function checkRecentCases() {
    try {
        const res = await query(`
            SELECT id, case_number, policy_number, deceased_id, deceased_name 
            FROM cases 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        fs.writeFileSync('recent_cases_utf8.json', JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkRecentCases();
