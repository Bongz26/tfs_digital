const { query } = require('./config/db');

async function debugAllGroceries() {
    try {
        const res = await query(`
      SELECT id, case_number, funeral_date, requires_grocery, status, delivery_date
      FROM cases 
      WHERE requires_grocery = true
    `);
        console.log(`Found ${res.rows.length} TOTAL cases with requires_grocery=true`);
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debugAllGroceries();
