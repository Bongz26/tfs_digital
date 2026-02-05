const { query } = require('./config/db');

async function inspectPolicy() {
    try {
        console.log("Querying for policy '793165'...");
        const res = await query(`
            SELECT id, policy_number, requested_at, amount, status 
            FROM airtime_requests 
            WHERE policy_number LIKE '%793165%'
        `);
        console.log(`Found ${res.rows.length} records.`);
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

inspectPolicy();
