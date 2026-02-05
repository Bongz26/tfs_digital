const { query } = require('./config/db');

async function debugGroceriesCount() {
    const minDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const maxDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
        const res = await query(`
      SELECT COUNT(*)::int as count 
      FROM cases 
      WHERE requires_grocery = true 
      AND status IN ('intake', 'preparation', 'confirmed', 'in_progress')
      AND funeral_date BETWEEN $1 AND $2
    `, [minDate, maxDate]);

        console.log(`Total Relevant Cases: ${res.rows[0].count}`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debugGroceriesCount();
