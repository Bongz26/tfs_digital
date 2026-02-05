const { query } = require('./config/db');

async function correctStock() {
    try {
        const caseRes = await query("SELECT id FROM cases WHERE case_number = 'THS-2025-113'");
        const caseId = caseRes.rows[0].id;

        // 1. Find the accidental 'manual fix' Flat Lid movement from TODAY
        // inventory_id = 26 (Flat Lid)
        const acc = await query(`
            DELETE FROM stock_movements 
            WHERE case_id = $1 
            AND inventory_id = 26 
            AND created_at >= '2025-12-15 00:00:00'
            RETURNING *
        `, [caseId]);

        if (acc.rows.length > 0) {
            console.log(`Deleted ${acc.rows.length} accidental Flat Lid movements.`);
            // Refund stock
            await query("UPDATE inventory SET stock_quantity = stock_quantity + $1 WHERE id = 26", [acc.rows.length]);
            console.log('Stock refunded for Flat Lid.');
        } else {
            console.log('No accidental Flat Lid movements found from today.');
        }

        // 2. Add Pongee Movement (ID 4)
        // Check if already exists first
        const check = await query("SELECT * FROM stock_movements WHERE case_id=$1 AND inventory_id=4", [caseId]);
        if (check.rows.length === 0) {
            console.log('Adding Pongee movement...');
            // Deduct stock
            await query("UPDATE inventory SET stock_quantity = stock_quantity - 1 WHERE id = 4");
            // Log movement
            await query(`
                INSERT INTO stock_movements (inventory_id, case_id, movement_type, quantity_change, previous_quantity, new_quantity, reason, recorded_by, created_at)
                VALUES (4, $1, 'sale', -1, (SELECT stock_quantity+1 FROM inventory WHERE id=4), (SELECT stock_quantity FROM inventory WHERE id=4), 'Correction: Pongee', 'system', NOW())
            `, [caseId]);
            console.log('Pongee added.');
        } else {
            console.log('Pongee already exists.');
        }

        process.exit(0);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

correctStock();
