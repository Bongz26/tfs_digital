const { query } = require('./config/db');

async function debugGroceriesSimpler() {
    const minDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const maxDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Checking without the empty string check first
    try {
        const res = await query(`
      SELECT COUNT(*)::int as submitted 
      FROM cases 
      WHERE requires_grocery = true 
      AND status IN ('intake', 'preparation', 'confirmed', 'in_progress')
      AND funeral_date BETWEEN $1 AND $2
      AND delivery_date IS NOT NULL
    `, [minDate, maxDate]);

        console.log(`Submitted Cases (NOT NULL check only): ${res.rows[0].submitted}`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debugGroceriesSimpler();
