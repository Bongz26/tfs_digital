const { query } = require('./config/db');

async function fixCase100() {
    try {
        console.log('🔍 Checking Case THS-2025-100...');

        // 1. Get Case ID
        const caseRes = await query("SELECT id FROM cases WHERE case_number = 'THS-2025-100'");
        if (caseRes.rows.length === 0) throw new Error("Case 100 not found");
        const caseId = caseRes.rows[0].id;

        // 2. Find current movement (Likely Pongee Plywood)
        const currentMov = await query(`
            SELECT sm.id, sm.inventory_id, i.name, i.color, sm.quantity_change 
            FROM stock_movements sm
            JOIN inventory i ON sm.inventory_id = i.id
            WHERE sm.case_id = $1
        `, [caseId]);

        console.log('Current Movement:', currentMov.rows);

        // 3. Find correct inventory item (Pongee Redwood)
        // I created it in the previous step, so it should exist now.
        const redwoodRes = await query("SELECT id, name, color, stock_quantity FROM inventory WHERE name = 'Pongee' AND color = 'Redwood'");
        let redwoodId;

        if (redwoodRes.rows.length === 0) {
            console.log("⚠️ Pongee Redwood not found (strange, I just made it). Creating...");
            const newI = await query(`
                INSERT INTO inventory (name, category, color, stock_quantity, low_stock_threshold, location)
                VALUES ('Pongee', 'coffin', 'Redwood', 0, 1, 'Manekeng Showroom')
                RETURNING id
            `);
            redwoodId = newI.rows[0].id;
        } else {
            redwoodId = redwoodRes.rows[0].id;
            console.log(`✅ Found Pongee Redwood: ID ${redwoodId}`);
        }

        // 4. Correct the movement
        if (currentMov.rows.length > 0) {
            const wrongMov = currentMov.rows[0];
            // Refund wrong item
            await query("UPDATE inventory SET stock_quantity = stock_quantity - $1 WHERE id = $2", [wrongMov.quantity_change, wrongMov.inventory_id]);
            console.log(`Refunded ID ${wrongMov.inventory_id}`);

            // Update movement to point to correct item
            await query("UPDATE stock_movements SET inventory_id = $1, reason = 'Correction: Pongee Redwood' WHERE id = $2", [redwoodId, wrongMov.id]);

            // Deduct correct item
            await query("UPDATE inventory SET stock_quantity = stock_quantity - 1 WHERE id = $1", [redwoodId]);
            console.log(`Deducted ID ${redwoodId}`);

        } else {
            // Create new movement if missing
            await query(`
                INSERT INTO stock_movements (inventory_id, case_id, movement_type, quantity_change, previous_quantity, new_quantity, reason, recorded_by, created_at)
                VALUES ($1, $2, 'sale', -1, 0, -1, 'Correction: Pongee Redwood', 'system', NOW())
            `, [redwoodId, caseId]);
            await query("UPDATE inventory SET stock_quantity = stock_quantity - 1 WHERE id = $1", [redwoodId]);
        }

        console.log('✅ Case 100 fixed.');
        process.exit(0);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fixCase100();
