const { query } = require('./config/db');

async function checkCount() {
    try {
        const res = await query("SELECT count(*) FROM stock_movements WHERE created_at >= '2025-12-15'");
        console.log('Movement Count since Dec 15:', res.rows[0].count);
    } catch (err) {
        console.error(err);
    }
    process.exit();
}

checkCount();
