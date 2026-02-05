const { query } = require('./config/db');
const fs = require('fs');

async function checkCases() {
    try {
        console.log("Checking cases for policy 793165...");
        const res = await query(`
            SELECT id, case_number, policy_number, status, deceased_name
            FROM cases 
            WHERE policy_number LIKE '%793165%'
        `);
        fs.writeFileSync('cases_dupe_check_utf8.json', JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkCases();
