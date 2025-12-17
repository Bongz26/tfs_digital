const { query } = require('./config/db');
const fs = require('fs');

async function checkConstraints() {
    try {
        const res = await query(`
            SELECT conname, pg_get_constraintdef(c.oid)
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE conrelid = 'cases'::regclass
        `);
        fs.writeFileSync('constraints.json', JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkConstraints();
