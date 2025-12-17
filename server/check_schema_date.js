const { query } = require('./config/db');

async function checkDateSchema() {
    try {
        const res = await query(`
            SELECT column_name, column_default, is_nullable, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'cases' AND column_name IN ('funeral_date', 'service_date')
        `);
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkDateSchema();
