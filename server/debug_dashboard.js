const { query } = require('./config/db');

async function debugDashboardGrocery() {
    const minDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const maxDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log('--- DEBUG DASHBOARD GROCERY QUERY ---');
    console.log(`Checking Date Range: ${minDate} to ${maxDate}`);

    try {
        const res = await query(`
      SELECT id, case_number, funeral_date, requires_grocery, delivery_date, status
      FROM cases 
      WHERE requires_grocery = true 
      AND status IN ('intake', 'preparation', 'confirmed', 'in_progress')
      AND funeral_date BETWEEN $1 AND $2
    `, [minDate, maxDate]);

        console.log(`\nFound ${res.rows.length} relevant cases:`);
        console.table(res.rows);

        const submittedCount = res.rows.filter(c => c.delivery_date && c.delivery_date.trim() !== '').length;
        console.log(`\nLocal DB Logic would return: ${submittedCount}/${res.rows.length}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debugDashboardGrocery();
