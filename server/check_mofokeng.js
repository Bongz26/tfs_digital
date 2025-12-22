const { query } = require('./config/db');

async function checkMofokeng() {
    try {
        console.log('--- MOFOKENG ---');
        const cRes = await query("SELECT id, case_number, deceased_name, funeral_date FROM cases WHERE deceased_name ILIKE '%ESAIAH%'");
        console.table(cRes.rows);

        if (cRes.rows.length > 0) {
            const id = cRes.rows[0].id;
            const mRes = await query("SELECT id, created_at, quantity_change FROM stock_movements WHERE case_id = $1", [id]);
            console.table(mRes.rows);
        }

    } catch (err) {
        console.error(err);
    }
    process.exit();
}

checkMofokeng();
