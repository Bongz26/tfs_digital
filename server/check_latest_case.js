const { query } = require('./config/db');
const fs = require('fs');

async function checkLatestCase() {
    try {
        const res = await query(`
            SELECT id, case_number, created_at, funeral_date, funeral_time, service_date, service_time, delivery_date, delivery_time, church_date, church_time 
            FROM cases 
            ORDER BY created_at DESC 
            LIMIT 1
        `);
        fs.writeFileSync('latest_case_utf8.json', JSON.stringify(res.rows[0], null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkLatestCase();
