const { query } = require('./config/db');

async function checkDeliverySchema() {
    try {
        const res = await query(`
            SELECT column_name, is_nullable, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'cases' AND column_name = 'delivery_date'
        `);
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkDeliverySchema();
