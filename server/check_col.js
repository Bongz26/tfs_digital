const { query } = require('./config/db');
async function check() {
    try {
        const res = await query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'is_yard_burial'");
        console.log('Column check:', res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
