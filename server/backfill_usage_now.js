const { query } = require('./config/db');

async function backfillNow() {
    try {
        console.log('--- STARTING BACKFILL FOR THIS WEEK ---');

        // Use the same logic as the controller
        const casesRes = await query(`
            SELECT c.id, c.case_number, c.deceased_name, c.casket_type, c.casket_colour, c.funeral_date
            FROM cases c
            WHERE c.funeral_date >= '2025-12-15'
              AND NOT EXISTS (
                  SELECT 1 FROM stock_movements sm 
                  WHERE sm.case_id = c.id 
                  AND (sm.movement_type = 'sale' OR (sm.movement_type = 'adjustment' AND sm.quantity_change < 0))
              )
            ORDER BY c.funeral_date
        `);

        console.log(`Found ${casesRes.rows.length} cases needing backfill.`);

        for (const c of casesRes.rows) {
            const nameStr = String(c.casket_type || '').trim();
            const colorStr = String(c.casket_colour || '').trim();
            if (!nameStr) { console.log(`[SKIP] Case ${c.id}: No casket type`); continue; }

            // Find best inventory match
            let inv = await query(
                `SELECT id, name, model, color FROM inventory WHERE category='coffin' AND (
                    UPPER(TRIM(name)) = UPPER(TRIM($1))
                    OR UPPER(TRIM(model)) = UPPER(TRIM($1))
                    OR UPPER(name) LIKE '%' || UPPER(TRIM($1)) || '%'
                    OR UPPER(TRIM($1)) LIKE '%' || UPPER(name) || '%'
                )
                AND (
                    $2 IS NULL OR color IS NULL OR UPPER(TRIM(color)) = UPPER(TRIM($2))
                    OR UPPER(color) LIKE '%' || UPPER(TRIM($2)) || '%'
                    OR UPPER(TRIM($2)) LIKE '%' || UPPER(color) || '%'
                )
                ORDER BY id DESC LIMIT 1`,
                [nameStr, colorStr || null]
            );

            const item = inv.rows[0];
            if (!item) {
                console.log(`[FAIL] Case ${c.id} (${c.deceased_name}): No inventory match for "${nameStr}" / "${colorStr}"`);
                continue;
            }

            // Create movement, backdated to funeral_date
            const date = c.funeral_date || new Date();
            // Reset to noon to be safe
            // const safeDate = new Date(date);
            // safeDate.setHours(12, 0, 0, 0);

            await query(
                `INSERT INTO stock_movements (inventory_id, case_id, movement_type, quantity_change, previous_quantity, new_quantity, reason, recorded_by, created_at)
                 VALUES ($1,$2,'sale',-1,NULL,NULL,'Auto-Backfill for Report', 'system', $3)`,
                [item.id, c.id, date]
            );

            // Also deduct from stock quantity for consistency
            await query("UPDATE inventory SET stock_quantity = stock_quantity - 1 WHERE id = $1", [item.id]);

            console.log(`[SUCCESS] Case ${c.id}: Linked to Inv ${item.id} (${item.name} ${item.color}). Backdated to ${date}`);
        }

    } catch (err) {
        console.error(err);
    }
    process.exit();
}

backfillNow();
