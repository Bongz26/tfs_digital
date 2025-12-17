const { query } = require('./config/db');

async function checkToday() {
    try {
        const res = await query("SELECT * FROM cases WHERE created_at > '2025-12-16'");
        console.log(`Found ${res.rows.length} cases since yesterday.`);
        if (res.rows.length > 0) {
            console.log(JSON.stringify(res.rows, null, 2));
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkToday();
