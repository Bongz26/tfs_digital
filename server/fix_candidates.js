const { query } = require('./config/db');

async function fixCandidates() {
    try {
        const res = await query(`
            UPDATE cases 
            SET funeral_date = NULL, service_date = NULL 
            WHERE funeral_time IS NULL 
              AND service_time IS NULL 
              AND (funeral_date IS NOT NULL OR service_date IS NOT NULL)
            RETURNING case_number, funeral_date, service_date
        `);
        console.log(`Cleaned up ${res.rows.length} cases.`);
        // console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fixCandidates();
