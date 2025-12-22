const { query } = require('./config/db');

async function checkData() {
    try {
        console.log('--- CASES ---');
        const caseRes = await query("SELECT id, case_number, deceased_name, casket_type, casket_colour, funeral_date FROM cases WHERE deceased_name ILIKE '%MOFOKENG%'");
        console.log(JSON.stringify(caseRes.rows, null, 2));

        console.log('\n--- INVENTORY ---');
        const invRes = await query("SELECT id, name, category, stock_quantity, color FROM inventory WHERE name ILIKE '%Pongee%'");
        console.log(JSON.stringify(invRes.rows, null, 2));

    } catch (err) {
        console.error(err);
    }
    process.exit();
}

checkData();
