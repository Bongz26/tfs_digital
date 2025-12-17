const { query } = require('../server/config/db');

// Map of User provided names to potentially matching database names/models
// Format: "User Given Name": { search: "Database Search Term", exact: true/false }
const stockToUpdate = {
    "Prince Dome": 3,
    "Octagon": 1,
    "Pongee Cherry": 3,
    "Pongee Plywood": 1,
    "Pongee Wallnut": 1,
    "1/4 View": 3,
    "4 Tier": 3,
    "Raised Halfview": 1,
    "Flat Lid Redwood": 1,
    "3 Tier Redwood": 1,
    "Flat Lid Kiaat": 2,
    "Flat Lid Grain": 2,
    "Econo Cherry": 2,
    "Flat Lid Midbrown": 1,
    "5 Feet Redwood": 3,
    "4 Feet Kiaat": 1,
    "3 Feet kiaat": 1, // Note case difference in input
    "2 Feet Kiaat": 2,
    "2 Feet White": 3,
    "4 Feet White": 1,
    "4 Feet Kiaat Dutch": 1,
    "5 Feet Kiaat Dutch": 1,
    "2.6 Feet Kiaat": 1,
    "1.9 Feet": 4
};

async function updateStock() {
    console.log('📦 Starting Inventory Stock Update...');
    console.log('-----------------------------------');

    // First, clear all existing coffin stock to 0 to ensure clean slate? 
    // The user said "I will delete everything there and add the coffin stock..."
    // Ideally we update matches and maybe warn about non-matches.
    // Let's set all coffins to 0 first as per implied instruction "start that process again"

    try {
        await query("UPDATE inventory SET stock_quantity = 0 WHERE category = 'coffin'");
        console.log('✅ Reset all coffin stock to 0.');
    } catch (e) {
        console.error('❌ Failed to reset stock:', e);
        process.exit(1);
    }

    const notFound = [];

    for (const [name, qty] of Object.entries(stockToUpdate)) {
        let found = false;

        // Try exact name match
        let res = await query("SELECT id, name FROM inventory WHERE category='coffin' AND LOWER(name) = LOWER($1)", [name]);

        // Try LIKE match if exact fails
        if (res.rows.length === 0) {
            res = await query("SELECT id, name FROM inventory WHERE category='coffin' AND name ILIKE $1", [`%${name}%`]);
        }

        // Try Model match
        if (res.rows.length === 0) {
            res = await query("SELECT id, name FROM inventory WHERE category='coffin' AND model ILIKE $1", [`%${name}%`]);
        }

        // Special handling for "Feet" items which might be named differently in DB (e.g. "4ft" vs "4 Feet")
        if (res.rows.length === 0 && name.includes('Feet')) {
            const shortName = name.replace('Feet', 'ft').replace('feet', 'ft');
            res = await query("SELECT id, name FROM inventory WHERE category='coffin' AND (name ILIKE $1 OR model ILIKE $1)", [`%${shortName}%`]);
        }

        if (res.rows.length > 0) {
            // If multiple matches found (e.g. "Flat Lid Kiaat" might match "Flat Lid Kiaat Regular" and "Flat Lid Kiaat Oversized"),
            // we might need to be careful. For now, we update the first/best match or all?
            // Let's safe update the most precise match.
            const item = res.rows[0];
            await query("UPDATE inventory SET stock_quantity = $1, updated_at = NOW() WHERE id = $2", [qty, item.id]);
            console.log(`✅ Updated: "${name}" -> Matched DB: "${item.name}" -> Qty: ${qty}`);

            // Log movement
            await query(`
                INSERT INTO stock_movements (inventory_id, movement_type, quantity_change, previous_quantity, new_quantity, reason, recorded_by)
                VALUES ($1, 'adjustment', $2, 0, $2, 'Manual Reset - Dec 8 Opening Stock', 'System Script')
            `, [item.id, qty]);

        } else {
            // If completely not found, maybe create it? 
            // Providing option to create would be better, but for now just log it.
            console.warn(`⚠️  NOT FOUND: "${name}" - Qty: ${qty} (No matching item in DB)`);
            notFound.push({ name, qty });
        }
    }

    console.log('-----------------------------------');
    if (notFound.length > 0) {
        console.log('❌ The following items were not found in the database. Please add them manually or check spelling:');
        notFound.forEach(i => console.log(`   - ${i.name} (Qty: ${i.qty})`));

        // Optional: Auto-create missing items?
        // Let's create them to ensure the user request is fulfilled
        console.log('-----------------------------------');
        console.log('🆕 Creating missing items...');
        for (const item of notFound) {
            const insert = await query(`
                INSERT INTO inventory (name, category, stock_quantity, unit_price, min_quantity)
                VALUES ($1, 'coffin', $2, 0, 1) -- default price 0
                RETURNING id
             `, [item.name, item.qty]);
            console.log(`   Created: "${item.name}" with Qty: ${item.qty}`);

            await query(`
                INSERT INTO stock_movements (inventory_id, movement_type, quantity_change, previous_quantity, new_quantity, reason, recorded_by)
                VALUES ($1, 'adjustment', $2, 0, $2, 'Manual Reset - Auto Create', 'System Script')
            `, [insert.rows[0].id, item.qty]);
        }
    }

    console.log('✅ Stock update complete.');
    process.exit(0);
}

updateStock().catch(e => console.error(e));
