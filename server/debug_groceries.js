const { query } = require('./config/db');

async function checkGroceries() {
    try {
        const res = await query(`
      SELECT id, case_number, funeral_date, requires_grocery, status 
      FROM cases 
      WHERE requires_grocery = true 
      AND status IN ('intake', 'preparation', 'confirmed', 'in_progress')
    `);
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkGroceries();
