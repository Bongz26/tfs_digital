const { query } = require('./config/db');

async function engineeringCheck() {
    try {
        console.log('--- ENGINEERING DIAGNOSTIC ---');

        // 1. Get the Target Cases (We know these names from user context)
        // Dec 15 - Dec 23
        const targetNames = ['%ZIKALALA%', '%SEBUSI%', '%LENATHA%', '%MOKOENA%', '%MOFOKENG%', '%SEMELA%'];

        for (const namePattern of targetNames) {
            console.log(`\nChecking: ${namePattern}`);

            // Get Case Data
            const cRes = await query(`
                SELECT id, death_date, funeral_date, deceased_name, casket_type, casket_colour 
                FROM cases 
                WHERE deceased_name ILIKE $1`,
                [namePattern]
            );

            if (cRes.rows.length === 0) {
                console.log('  -> Case NOT FOUND in DB');
                continue;
            }

            const c = cRes.rows[0];
            console.log(`  -> Case ID: ${c.id}`);
            console.log(`  -> Funeral Date: ${c.funeral_date}`);
            console.log(`  -> Casket: ${c.casket_type} (${c.casket_colour})`);

            // Get Linked Stock Movements
            const smRes = await query(`
                SELECT id, created_at, movement_type, quantity_change 
                FROM stock_movements 
                WHERE case_id = $1`,
                [c.id]
            );

            if (smRes.rows.length === 0) {
                console.log('  -> ⚠️ NO STOCK MOVEMENTS FOUND (Data Gap)');
            } else {
                smRes.rows.forEach(m => {
                    console.log(`  -> Movement ID: ${m.id} | Date: ${m.created_at.toISOString()} | Qty: ${m.quantity_change}`);
                });
            }
        }

    } catch (err) {
        console.error(err);
    }
    process.exit();
}

engineeringCheck();
