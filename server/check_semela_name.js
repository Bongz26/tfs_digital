const { query } = require('./config/db');

async function checkSemela() {
    try {
        console.log('Finding Semela...');
        const cRes = await query("SELECT id, case_number, deceased_name FROM cases WHERE deceased_name ILIKE '%SEMELA%'");
        console.log(cRes.rows);

        if (cRes.rows.length > 0) {
            const id = cRes.rows[0].id;
            console.log(`Checking movements for Case ID ${id}...`);
            const mRes = await query("SELECT * FROM stock_movements WHERE case_id = $1", [id]);
            console.log(mRes.rows);
        }

    } catch (err) {
        console.error(err);
    }
    process.exit();
}

checkSemela();
