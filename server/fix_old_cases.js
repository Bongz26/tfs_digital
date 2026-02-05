const { query } = require('./config/db');

async function fixOldCases() {
    try {
        const res = await query(`
            UPDATE cases 
            SET funeral_date = NULL 
            WHERE case_number = 'THS-2025-116'
            RETURNING case_number, funeral_date
        `);
        console.log("Fixed cases:", res.rows);
        process.exit(0);
    } catch (e) {
        console.error("Error message:", e.message);
        console.error("Error detail:", e.detail);
        process.exit(1);
    }
}

fixOldCases();
