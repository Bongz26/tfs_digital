const { query } = require('./config/db');

async function testUpdate() {
    try {
        const res = await query(`
            UPDATE cases 
            SET funeral_date = '2099-01-01' 
            WHERE case_number = 'THS-2025-116'
            RETURNING case_number, funeral_date
        `);
        console.log("Updated to dummy:", res.rows);
        process.exit(0);
    } catch (e) {
        console.error("Error message:", e.message);
        process.exit(1);
    }
}

testUpdate();
