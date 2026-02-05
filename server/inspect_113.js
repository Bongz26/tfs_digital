const { query } = require('./config/db');

async function deeplyInspect() {
    try {
        const caseRes = await query("SELECT id, case_number, casket_type FROM cases WHERE case_number = 'THS-2025-113'");
        const c = caseRes.rows[0];

        const movs = await query(`
            SELECT sm.id, sm.inventory_id, i.name, i.color, sm.quantity_change, sm.created_at
            FROM stock_movements sm
            JOIN inventory i ON sm.inventory_id = i.id
            WHERE sm.case_id = $1
        `, [c.id]);

        const pongee = await query("SELECT id, name FROM inventory WHERE name ILIKE '%Pongee%'");
        const flat = await query("SELECT id, name FROM inventory WHERE name ILIKE '%Flat Lid%'");

        const output = {
            case: c,
            movements: movs.rows,
            pongee_ids: pongee.rows,
            flat_ids: flat.rows
        };

        console.log(JSON.stringify(output, null, 2));
        process.exit(0);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

deeplyInspect();
