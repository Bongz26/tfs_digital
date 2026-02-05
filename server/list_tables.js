require('dotenv').config();
const { query } = require('./config/db');
async function run() {
    try {
        const res = await query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
        console.log('--- TABLES ---');
        res.rows.forEach(r => console.log(r.tablename));
        console.log('--- END ---');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
