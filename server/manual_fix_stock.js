const { query } = require('./config/db');

async function fixMissingStock() {
    try {
        // 1. Get Latest Case
        const caseRes = await query('SELECT id, case_number FROM cases ORDER BY created_at DESC LIMIT 1');
        const theCase = caseRes.rows[0];
        console.log('Case:', theCase);

        // 2. Get Inventory Item (Hardcoded ID 26 based on previous check, or fallback search)
        let itemRes = await query("SELECT id, name, stock_quantity FROM inventory WHERE id = 26");
        // Verify it is somewhat correct
        if (itemRes.rows.length === 0 || !itemRes.rows[0].name.includes('Redwood')) {
            console.log('ID 26 not Redwood? Searching...');
            itemRes = await query("SELECT id, name, stock_quantity FROM inventory WHERE name ILIKE '%Redwood%' LIMIT 1");
        }

        const item = itemRes.rows[0];
        console.log('Item:', item);

        if (!theCase || !item) {
            console.log('Missing case or item');
            process.exit(1);
        }

        // 3. Fix
        const newQty = (item.stock_quantity) - 1;
        await query('UPDATE inventory SET stock_quantity = $1 WHERE id = $2', [newQty, item.id]);

        await query(`
             INSERT INTO stock_movements 
             (inventory_id, case_id, movement_type, quantity_change, previous_quantity, new_quantity, reason, recorded_by)
             VALUES ($1, $2, 'sale', -1, $3, $4, 'Manual Fix', 'system')
        `, [item.id, theCase.id, item.stock_quantity, newQty]);

        console.log('Done');
        process.exit(0);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fixMissingStock();
