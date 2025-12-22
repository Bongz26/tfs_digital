const { query } = require('./config/db');

async function checkInv() {
    try {
        const res = await query("SELECT id, name, color, stock_quantity FROM inventory WHERE name ILIKE '%Pongee%'");
        console.log('--- PONGEE INVENTORY ---');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    }
    process.exit();
}

checkInv();
