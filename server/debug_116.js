const { query } = require('./config/db');

async function debugCase116() {
    try {
        const res = await query(`
            SELECT id, case_number, created_at, funeral_date, service_date, delivery_date, church_date 
            FROM cases 
            WHERE case_number = 'THS-2025-116'
        `);
        console.log("DB Row for THS-2025-116:");
        console.log(JSON.stringify(res.rows[0], null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debugCase116();
