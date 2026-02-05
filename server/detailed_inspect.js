const { query } = require('./config/db');

async function detailedInspect() {
    try {
        console.log('--- ALL SEMELA MOVEMENTS ---');
        const semela = await query(`
            SELECT sm.id, sm.created_at, sm.quantity_change, c.case_number 
            FROM stock_movements sm
            JOIN cases c ON sm.case_id = c.id
            WHERE c.case_number = 'THS-2025-113'
        `);
        console.table(semela.rows);

        console.log('\n--- ALL MOVEMENTS IN REPORT WINDOW (Dec 15 - Dec 23) ---');
        const report = await query(`
            SELECT sm.id, sm.created_at, c.case_number, c.deceased_name, c.funeral_date
            FROM stock_movements sm
            LEFT JOIN cases c ON sm.case_id = c.id
            WHERE sm.created_at >= '2025-12-15 00:00:00' 
              AND sm.created_at <= '2025-12-23 23:59:59'
              AND sm.quantity_change < 0
        `);
        // Just print first 10
        console.table(report.rows.slice(0, 10));
        console.log(`Total rows in window: ${report.rows.length}`);

    } catch (err) {
        console.error(err);
    }
    process.exit();
}

detailedInspect();
