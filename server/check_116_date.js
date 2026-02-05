const { query } = require('./config/db');
const fs = require('fs');

async function check116Date() {
    try {
        const res = await query(`
            SELECT case_number, created_at, funeral_date 
            FROM cases 
            WHERE case_number = 'THS-2025-116'
        `);
        fs.writeFileSync('case116_utf8.json', JSON.stringify(res.rows[0], null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check116Date();
