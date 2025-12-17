const { query } = require('./config/db');

async function fixSchema() {
    try {
        console.log("Attempting to allow NULLs for funeral_date and service_date...");

        await query(`ALTER TABLE cases ALTER COLUMN funeral_date DROP NOT NULL`);
        await query(`ALTER TABLE cases ALTER COLUMN service_date DROP NOT NULL`);

        console.log("Schema updated: funeral_date and service_date are now specific nullable.");

        // Now we can fix the specific case 116 to be NULL (Not Set) as the user originally desired
        // or to a sensible date if they prefer. The user complained about seeing a date when they didn't enter one.
        // So NULL is the most "sensible" thing for "I didn't enter it".

        const res = await query(`
            UPDATE cases 
            SET funeral_date = NULL, service_date = NULL
            WHERE case_number = 'THS-2025-116'
            RETURNING case_number, funeral_date, service_date
        `);

        console.log("Case 116 updated to NULL dates:", res.rows[0]);
        process.exit(0);
    } catch (e) {
        console.error("Schema update failed:", e.message);
        process.exit(1);
    }
}

fixSchema();
