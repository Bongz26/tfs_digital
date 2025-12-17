const { query } = require('./config/db');

async function checkRecentCase() {
    try {
        console.log('🔍 Checking latest case created today...');
        const res = await query(`
            SELECT id, case_number, deceased_name, casket_type, casket_colour, created_at 
            FROM cases 
            WHERE created_at >= '2025-12-15 00:00:00'
            ORDER BY created_at DESC
            LIMIT 5
        `);

        if (res.rows.length === 0) {
            console.log('No cases created today.');
        } else {
            console.table(res.rows);

            // Check dictionary match for the top one
            const c = res.rows[0];
            if (c.casket_type) {
                console.log(`\nChecking inventory match for: "${c.casket_type}" Color: "${c.casket_colour}"`);
                const inv = await query(`
                    SELECT * FROM inventory 
                    WHERE category='coffin' 
                    AND (UPPER(name) = UPPER($1) OR UPPER(model) = UPPER($1))
                    AND (color IS NULL OR UPPER(color) = UPPER($2))
                `, [c.casket_type, c.casket_colour || '']);

                if (inv.rows.length > 0) {
                    console.log('✅ Match FOUND in inventory:', inv.rows[0].name);

                    // Check if movement exists
                    const mov = await query('SELECT * FROM stock_movements WHERE case_id = $1', [c.id]);
                    if (mov.rows.length > 0) {
                        console.log('✅ Stock movement LOGGED:', mov.rows[0]);
                    } else {
                        console.log('❌ NO stock movement found for this case!');
                    }
                } else {
                    console.log('❌ NO MATCH in inventory. This is why stock was not deducted.');
                    // fuzz check
                    const fuzz = await query(`SELECT name, model, color FROM inventory WHERE name ILIKE $1`, [`%${c.casket_type}%`]);
                    console.log('Did you mean one of these?', fuzz.rows);
                }
            }
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkRecentCase();
