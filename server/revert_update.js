const { query } = require('./config/db');

async function revertUpdate() {
    try {
        const res = await query(`
            UPDATE cases 
            SET funeral_date = '2025-12-14' 
            WHERE case_number = 'THS-2025-116'
            RETURNING case_number, funeral_date
        `);
        console.log("Reverted:", res.rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

revertUpdate();
