const { query } = require('../server/config/db');

async function syncPastCases() {
    console.log('🔄 Starting Re-Sync for Cases from Dec 8 to Dec 13...');
    console.log('-----------------------------------');

    // 1. Get all confirmed cases between Dec 8 and Dec 13 (inclusive)
    // Adjust dates slightly to ensure full coverage (e.g. Dec 8 00:00 to Dec 13 23:59)
    const casesRes = await query(`
        SELECT id, case_number, deceased_name, casket_type, casket_colour, status, created_at, funeral_date
        FROM cases
        WHERE created_at >= '2025-12-08 00:00:00' 
          AND created_at <= '2025-12-13 23:59:59'
          AND status != 'cancelled'
        ORDER BY created_at ASC
    `);

    console.log(`🔎 Found ${casesRes.rows.length} cases to process.`);
    let processed = 0;
    let failed = 0;

    for (const c of casesRes.rows) {
        console.log(`Processing ${c.case_number} (${c.deceased_name})...`);
        const nameStr = (c.casket_type || '').trim();
        const colorStr = (c.casket_colour || '').trim();

        if (!nameStr) {
            console.log(`   🔸 No casket type specified. Skipping.`);
            continue;
        }

        // 2. Find the matching inventory item (exact logic from casesController)
        let inv;
        if (colorStr) {
            inv = await query(
                "SELECT id, name, stock_quantity FROM inventory WHERE category='coffin' AND UPPER(name) = UPPER($1) AND (color IS NULL OR UPPER(color) = UPPER($2)) ORDER BY stock_quantity DESC LIMIT 1",
                [nameStr, colorStr]
            );
        } else {
            inv = await query(
                "SELECT id, name, stock_quantity FROM inventory WHERE category='coffin' AND UPPER(name) = UPPER($1) ORDER BY stock_quantity DESC LIMIT 1",
                [nameStr]
            );
        }

        // Fallback to model match logic
        if (inv.rows.length === 0) {
            let fallback;
            if (colorStr) {
                fallback = await query(
                    "SELECT id, name, stock_quantity FROM inventory WHERE category='coffin' AND UPPER(model) = UPPER($1) AND (color IS NULL OR UPPER(color) = UPPER($2)) ORDER BY stock_quantity DESC LIMIT 1",
                    [nameStr, colorStr]
                );
            } else {
                fallback = await query(
                    "SELECT id, name, stock_quantity FROM inventory WHERE category='coffin' AND UPPER(model) = UPPER($1) ORDER BY stock_quantity DESC LIMIT 1",
                    [nameStr]
                );
            }
            inv = fallback;
        }

        if (inv.rows.length > 0) {
            const item = inv.rows[0];

            // 3. Deduct stock AGAIN
            // We assume the manual reset established the "Opening Balance" BEFORE these cases.
            // So we must now subtract 1 for each case.

            const currentQty = item.stock_quantity || 0;
            const newQty = currentQty - 1;

            await query('UPDATE inventory SET stock_quantity=$1, updated_at=NOW() WHERE id=$2', [newQty, item.id]);

            console.log(`   ✅ match found: "${item.name}" (ID: ${item.id}). Stock: ${currentQty} -> ${newQty}`);

            // 4. Record new movement
            await query(
                `INSERT INTO stock_movements (inventory_id, case_id, movement_type, quantity_change, previous_quantity, new_quantity, reason, recorded_by)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                [item.id, c.id, 'sale', -1, currentQty, newQty, 'Re-Sync Dec 8-13', 'System Script']
            );
            processed++;
        } else {
            console.log(`   ❌ Item NOT FOUND in inventory: "${nameStr}" ${colorStr ? '(' + colorStr + ')' : ''}`);
            failed++;
        }
    }

    console.log('-----------------------------------');
    console.log(`Summary: Processed ${processed} cases successfully. ${failed} cases had no matching stock.`);
    process.exit(0);
}

syncPastCases().catch(e => console.error(e));
