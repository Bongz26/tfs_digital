const { query } = require('./config/db');

async function migrateRoster() {
    try {
        console.log('--- Migrating Roster: Adding driver_id ---');

        // 1. Add column if not exists
        await query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roster' AND column_name='driver_id') THEN 
                    ALTER TABLE roster ADD COLUMN driver_id INTEGER REFERENCES drivers(id); 
                END IF; 
            END $$;
        `);
        console.log('✅ Column driver_id added.');

        // 2. Fetch roster entries with no driver_id
        const rosters = await query(`SELECT id, driver_name FROM roster WHERE driver_id IS NULL AND driver_name IS NOT NULL`);
        console.log(`Checking ${rosters.rows.length} entries for driver matching...`);

        let updated = 0;
        for (const row of rosters.rows) {
            const name = row.driver_name.trim();
            // Try specific match first
            let driver = await query(`SELECT id FROM drivers WHERE LOWER(name) = LOWER($1)`, [name]);
            if (driver.rows.length === 0) {
                // Try partial match
                driver = await query(`SELECT id FROM drivers WHERE LOWER(name) LIKE LOWER($1)`, [`%${name}%`]);
            }

            if (driver.rows.length > 0) {
                const driverId = driver.rows[0].id;
                await query(`UPDATE roster SET driver_id = $1 WHERE id = $2`, [driverId, row.id]);
                updated++;
                process.stdout.write('.');
            } else {
                console.warn(`\n⚠️  No match for driver: "${name}" (ID: ${row.id})`);
            }
        }

        console.log(`\n✅ Migration complete. Updated ${updated} records.`);
        process.exit(0);

    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

migrateRoster();
