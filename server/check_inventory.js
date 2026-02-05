const { query } = require('./config/db');
const fs = require('fs');

async function checkInventorySchema() {
    try {
        const res = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'inventory'
        `);
        fs.writeFileSync('inventory_info_utf8.json', JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkInventorySchema();
