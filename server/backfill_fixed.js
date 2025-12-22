const { query } = require('./config/db');

async function backfillFixed() {
    try {
        console.log('--- BACKFILL FIXED (No NULLs) ---');

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

        console.log(`Found ${casesRes.rows.length} remaining cases.`);

        for (const c of casesRes.rows) {
            const nameStr = String(c.casket_type || '').trim();
            const colorStr = String(c.casket_colour || '').trim();
            if (!nameStr) continue;

            let inv = await query(
                `SELECT id, name, model, color, stock_quantity FROM inventory WHERE category='coffin' AND (
                    UPPER(TRIM(name)) = UPPER(TRIM($1)) OR UPPER(TRIM(model)) = UPPER(TRIM($1)) 
                    OR UPPER(name) LIKE '%' || UPPER(TRIM($1)) || '%'
                )
                AND (
                    $2 IS NULL OR color IS NULL OR UPPER(TRIM(color)) = UPPER(TRIM($2))
                    OR UPPER(color) LIKE '%' || UPPER(TRIM($2)) || '%'
                )
                ORDER BY id DESC LIMIT 1`,
                [nameStr, colorStr || null]
            );

            const item = inv.rows[0];
            if (!item) {
                console.log(`[FAIL] No inv for ${c.deceased_name} (${nameStr} ${colorStr})`);
                continue;
            }

            const date = c.funeral_date || new Date();
            const prev = item.stock_quantity;
            const next = prev - 1;

            await query(
                `INSERT INTO stock_movements (inventory_id, case_id, movement_type, quantity_change, previous_quantity, new_quantity, reason, recorded_by, created_at)
                 VALUES ($1,$2,'sale',-1,$3,$4,'Auto-Backfill Fixed', 'system', $5)`,
                [item.id, c.id, prev, next, date]
            );

            await query("UPDATE inventory SET stock_quantity = stock_quantity - 1 WHERE id = $1", [item.id]);

            console.log(`[SUCCESS] Backfilled ${c.deceased_name}`);
        }

    } catch (err) {
        console.error(err);
    }
    process.exit();
}

backfillFixed();
