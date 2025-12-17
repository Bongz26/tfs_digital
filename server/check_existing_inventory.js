const { query } = require('./config/db');
const fs = require('fs');

async function checkExisting() {
    try {
        const res = await query(`
            SELECT id, name, model, color, stock_quantity, location 
            FROM inventory 
            ORDER BY name, color
            LIMIT 50
        `);
        fs.writeFileSync('inventory_sample_utf8.json', JSON.stringify(res.rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkExisting();
