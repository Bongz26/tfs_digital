const { query } = require('./config/db');
const fs = require('fs');

async function checkTriggers() {
    try {
        const res = await query(`
            SELECT tgname, pg_get_triggerdef(oid)
            FROM pg_trigger
            WHERE tgrelid = 'cases'::regclass
        `);
        fs.writeFileSync('triggers.json', JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkTriggers();
