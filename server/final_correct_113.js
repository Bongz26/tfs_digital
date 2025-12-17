const { query } = require('./config/db');

async function fullCorrection() {
    try {
        console.log('🚀 Starting Full Correction for Case THS-2025-113...');

        // 1. Get Case ID
        const caseRes = await query("SELECT id FROM cases WHERE case_number = 'THS-2025-113'");
        if (caseRes.rows.length === 0) throw new Error("Case not found");
        const caseId = caseRes.rows[0].id;

        // 2. Remove ALL existing movements for this case (Cleanup)
        const oldMovs = await query("DELETE FROM stock_movements WHERE case_id = $1 RETURNING inventory_id, quantity_change", [caseId]);
        console.log(`🗑️ Removed ${oldMovs.rowCount} incorrect movements.`);

        // 3. Refund Stock for removed movements
        for (const mov of oldMovs.rows) {
            // mov.quantity_change was likely -1. We SUBTRACT it to reverse? 
            // -1 means stock went down. We need to add it back.
            // stock = stock - (-1) => stock + 1.
            // So we subtract the quantity_change value?
            // yes: stock -= quantity_change. If change is -1, stock -= -1 => stock += 1.
            await query("UPDATE inventory SET stock_quantity = stock_quantity - $1 WHERE id = $2", [mov.quantity_change, mov.inventory_id]);
            console.log(`Refunded stock for Item ID ${mov.inventory_id}`);
        }

        // 4. Ensure "Pongee" (Redwood) Exists
        let pItem = await query("SELECT id, stock_quantity FROM inventory WHERE name = 'Pongee' AND color = 'Redwood'");
        let pId;

        if (pItem.rows.length === 0) {
            console.log("🆕 'Pongee (Redwood)' not found. Creating it...");
            // Initialize with 0 stock? Or -1?
            // "Pongee" category coffin.
            const newI = await query(`
                INSERT INTO inventory (name, category, color, stock_quantity, low_stock_threshold, location)
                VALUES ('Pongee', 'coffin', 'Redwood', 0, 1, 'Manekeng Showroom')
                RETURNING id
            `);
            pId = newI.rows[0].id;
        } else {
            pId = pItem.rows[0].id;
            console.log(`✅ Found 'Pongee (Redwood)' ID: ${pId}`);
        }

        // 5. Deduct Stock for Pongee Redwood
        await query("UPDATE inventory SET stock_quantity = stock_quantity - 1 WHERE id = $1", [pId]);

        // 6. Create Correct Movement
        await query(`
            INSERT INTO stock_movements 
            (inventory_id, case_id, movement_type, quantity_change, previous_quantity, new_quantity, reason, recorded_by, created_at)
            VALUES ($1, $2, 'sale', -1, (SELECT stock_quantity+1 FROM inventory WHERE id=$1), (SELECT stock_quantity FROM inventory WHERE id=$1), 'Correction: Pongee Redwood', 'system', NOW())
        `, [pId, caseId]);

        console.log("✅ Fixed: Case 113 now linked to Pongee (Redwood).");
        process.exit(0);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fullCorrection();
