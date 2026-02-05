const { query } = require('./config/db');

async function debugBackfill() {
    try {
        const cRes = await query("SELECT id, deceased_name, casket_type, casket_colour, funeral_date FROM cases WHERE id = 80");
        const c = cRes.rows[0];
        const invRes = await query("SELECT id FROM inventory WHERE name ILIKE '%Pongee%' AND color ILIKE '%Ash%'");
        const invId = invRes.rows[0].id;

        console.log(`Inserting for CID=${c.id} InvID=${invId}...`);

        await query(
            `INSERT INTO stock_movements (inventory_id, case_id, movement_type, quantity_change, previous_quantity, new_quantity, reason, recorded_by, created_at)
             VALUES ($1,$2,'sale',-1,0,0,'Debug Backfill', 'system', $3)`,
            [invId, c.id, c.funeral_date]
        );
        console.log('SUCCESS');

    } catch (err) {
        console.log('ERROR MESSAGE:', err.message);
        console.log('ERROR DETAIL:', err.detail);
        console.log('ERROR CODE:', err.code);
    }
    process.exit();
}
debugBackfill();
