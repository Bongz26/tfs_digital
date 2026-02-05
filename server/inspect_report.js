const { query } = require('./config/db');

async function inspectReportData() {
    try {
        console.log('--- INSPECTING DATA ---');

        // 1. Semela
        const semela = await query(`
            SELECT sm.id, sm.created_at, c.funeral_date, c.deceased_name 
            FROM stock_movements sm 
            JOIN cases c ON sm.case_id = c.id 
            WHERE c.case_number = 'THS-2025-113'
        `);
        console.log('SEMELA MOVEMENTS:');
        console.log(JSON.stringify(semela.rows, null, 2));

        // 2. Report Range
        const report = await query(`
            SELECT sm.id, sm.created_at, c.funeral_date, c.deceased_name 
            FROM stock_movements sm 
            LEFT JOIN cases c ON sm.case_id = c.id 
            WHERE sm.created_at >= '2025-12-15' AND sm.created_at <= '2025-12-23' 
            AND sm.quantity_change < 0
            LIMIT 5
        `);
        console.log('REPORT RANGE SAMPLES:');
        console.log(JSON.stringify(report.rows, null, 2));

        // 3. Funerals this week
        const funerals = await query(`
            SELECT id, deceased_name, funeral_date 
            FROM cases 
            WHERE funeral_date >= '2025-12-15' AND funeral_date <= '2025-12-23'
        `);
        console.log('FUNERALS THIS WEEK:');
        console.log(JSON.stringify(funerals.rows, null, 2));
    } catch (e) { console.error(e); }
    process.exit();
}
inspectReportData();
