const { query } = require('./config/db');

const originalLog = console.log;
console.log = function () { };

async function searchMofokeng() {
    try {
        console.error('--- SEARCHING MOFOKENG ---');
        const res = await query("SELECT id, case_number, deceased_name FROM cases WHERE deceased_name ILIKE '%MOFOKENG%'");
        res.rows.forEach(r => console.error(`FOUND: ${r.deceased_name} (ID: ${r.id})`));
        if (res.rows.length === 0) console.error("No MOFOKENG found");
    } catch (err) { console.error(err); }
    process.exit();
}
searchMofokeng();
