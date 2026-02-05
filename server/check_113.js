const { query } = require('./config/db');

async function checkSpecificCase() {
    try {
        console.log('Checking Case THS-2025-113...');
        const res = await query("SELECT id, case_number, deceased_name FROM cases WHERE case_number = 'THS-2025-113'");
        if (res.rows.length === 0) {
            console.log('Case not found.');
            process.exit(0);
        }
        const caseId = res.rows[0].id;
        console.log(`Case ID: ${caseId} (${res.rows[0].deceased_name})`);

        const movs = await query(`
            SELECT sm.id, sm.created_at, sm.quantity_change, i.name, i.category 
            FROM stock_movements sm 
            JOIN inventory i ON sm.inventory_id = i.id 
            WHERE sm.case_id = $1
        `, [caseId]);

        console.log(JSON.stringify(movs.rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkSpecificCase();
