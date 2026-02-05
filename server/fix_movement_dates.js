const { query } = require('./config/db');

async function fixMovements() {
    try {
        console.log('--- FIXING MOVEMENTS NOT IN REPORT ---');

        // 1. Get Cases with Funeral in Dec 15-23
        const cases = await query(`
            SELECT id, funeral_date, deceased_name
            FROM cases
            WHERE funeral_date >= '2025-12-15' AND funeral_date <= '2025-12-23'
        `);

        for (const c of cases.rows) {
            console.log(`Checking case ${c.deceased_name} (${c.funeral_date})...`);

            // Find movements
            const movs = await query("SELECT id, created_at FROM stock_movements WHERE case_id = $1", [c.id]);

            if (movs.rows.length === 0) {
                console.log(`  -> NO MOVEMENTS! Need backfill.`);
                // Logic to call backfill logic (Step 880 logic repeated or imported?)
                // For now, simpler: user ran backfill earlier.
            } else {
                for (const m of movs.rows) {
                    const mDate = new Date(m.created_at);
                    const fDate = new Date(c.funeral_date);

                    // If created_at is NOT on funeral_date, update it
                    // E.g. Created today (20th), Funeral (18th)

                    // We just overwrite created_at to funeral_date + 12 hours (noon)
                    const targetDate = new Date(fDate);
                    targetDate.setHours(12, 0, 0, 0);

                    await query("UPDATE stock_movements SET created_at = $1 WHERE id = $2", [targetDate, m.id]);
                    console.log(`  -> Updated Movement ${m.id} date to ${targetDate.toISOString()}`);
                }
            }
        }
    } catch (e) { console.error(e); }
    process.exit();
}

fixMovements();
