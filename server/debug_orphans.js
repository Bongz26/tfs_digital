const { query } = require('./config/db');

async function checkOrphans() {
    try {
        const res = await query(`
            SELECT sm.id, sm.created_at, sm.reason, sm.recorded_by, i.name 
            FROM stock_movements sm
            JOIN inventory i ON sm.inventory_id = i.id
            WHERE sm.case_id IS NULL 
            AND sm.created_at >= '2025-12-15 00:00:00'
            AND i.category = 'coffin'
            ORDER BY sm.created_at DESC
        `);
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkOrphans();
