const { query } = require('../server/config/db');

async function syncKnownCases() {
    console.log('🔄 Starting Re-Sync for Specific Known Cases...');
    console.log('-----------------------------------');

    // These are the specific cases provided by the user
    // We will hardcode the mapping logic for "Economy Casket" -> "Econo Cherry" etc if names differ
    const casesToSync = [
        { id: 68, case_number: 'THS-2025-108', casket_type: 'Economy Casket', casket_colour: 'Cherry' },
        { id: 66, case_number: 'THS-2025-106', casket_type: 'Pongee Casket', casket_colour: 'Cherry' },
        { id: 65, case_number: 'THS-2025-105', casket_type: 'Econo Casket', casket_colour: 'Cherry' },
        { id: 64, case_number: 'THS-2025-104', casket_type: 'Economy Casket', casket_colour: 'Cherry' },
        { id: 63, case_number: 'THS-2025-103', casket_type: 'Raised HalfView Casket', casket_colour: 'Cherry' },
        { id: 62, case_number: 'THS-2025-102', casket_type: 'Economy Casket', casket_colour: 'Cherry' },
        { id: 61, case_number: 'THS-2025-101', casket_type: 'Economy Casket', casket_colour: 'Cherry' },
        { id: 57, case_number: 'THS-2025-100', casket_type: 'Pongee Casket', casket_colour: 'Redwood' },
        // Cases 55 and 54 have null caskets, so we skip them
    ];

    let processed = 0;
    let failed = 0;

    for (const c of casesToSync) {
        console.log(`Processing ${c.case_number} (ID: ${c.id})...`);

        let targetName = c.casket_type;
        // Manual mapping based on user inventory list vs case data
        // Inventory List provided earlier: "Econo Cherry", "Pongee Cherry", "Raised Halfview"
        // Case Data: "Economy Casket", "Pongee Casket", "Raised HalfView Casket"

        if (c.casket_type.includes('Economy') || c.casket_type.includes('Econo')) {
            targetName = 'Econo Cherry'; // Best guess mapping
        } else if (c.casket_type.includes('Pongee') && c.casket_colour === 'Cherry') {
            targetName = 'Pongee Cherry';
        } else if (c.casket_type.includes('Pongee') && c.casket_colour === 'Redwood') {
            targetName = 'Pongee Wallnut'; // Or Pongee Plywood? "Redwood" wasn't in the exact list "Pongee Redwood" but maybe "Flat Lid Redwood"?
            // Wait, list had: "Pongee Cherry", "Pongee Plywood", "Pongee Wallnut".
            // If case says "Pongee Casket" + "Redwood", we might have a mismatch.
            // Let's try searching for "Pongee" and see what we get.
            targetName = 'Pongee';
        } else if (c.casket_type.includes('Raised HalfView')) {
            targetName = 'Raised Halfview';
        }

        console.log(`   🔸 Searching for: "${targetName}" (Original: ${c.casket_type} ${c.casket_colour})`);

        // Exact logic from previous script, but using our refined targetName
        let inv = await query(
            "SELECT id, name, stock_quantity FROM inventory WHERE category='coffin' AND (name ILIKE $1 OR model ILIKE $1)",
            [`%${targetName}%`]
        );

        // Specific fix for "Pongee Redwood" -> "Pongee Wallnut" if needed, or just warn
        if (inv.rows.length === 0 && targetName === 'Pongee') {
            // Try looser search
            inv = await query("SELECT id, name, stock_quantity FROM inventory WHERE category='coffin' AND name ILIKE '%Pongee%'");
        }

        if (inv.rows.length > 0) {
            // Pick best match if multiple
            const item = inv.rows[0];
            // In a real scenario we'd ask user to disambiguate Pongee versions, but let's take the first one found

            const currentQty = item.stock_quantity || 0;
            const newQty = currentQty - 1;

            await query('UPDATE inventory SET stock_quantity=$1, updated_at=NOW() WHERE id=$2', [newQty, item.id]);

            console.log(`   ✅ Matched: "${item.name}" (ID: ${item.id}). Deducting 1. New Stock: ${newQty}`);

            await query(
                `INSERT INTO stock_movements (inventory_id, case_id, movement_type, quantity_change, previous_quantity, new_quantity, reason, recorded_by)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                [item.id, c.id, 'sale', -1, currentQty, newQty, 'Re-Sync Manual Fix', 'System Script']
            );
            processed++;
        } else {
            console.log(`   ❌ Item NOT FOUND in inventory: "${targetName}"`);
            failed++;
        }
    }

    console.log('-----------------------------------');
    console.log(`Summary: Processed ${processed} cases successfully. ${failed} cases failed.`);
    process.exit(0);
}

syncKnownCases().catch(e => console.error(e));
