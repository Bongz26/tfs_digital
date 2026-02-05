const { query } = require('./config/db');

async function debugSemela() {
    try {
        console.log('--- DEBUG SEMELA ---');
        const res = await query(`
            SELECT sm.id, sm.created_at, c.funeral_date, c.deceased_name, c.case_number
            FROM stock_movements sm
            JOIN cases c ON sm.case_id = c.id
            WHERE c.case_number = 'THS-2025-113'
        `);

        console.log('Raw Rows:');
        console.log(res.rows);

        const row = res.rows[0];
        if (row) {
            console.log('\n--- TYPE CHECKS ---');
            console.log('created_at type:', typeof row.created_at);
            console.log('created_at vals:', row.created_at);
            console.log('funeral_date type:', typeof row.funeral_date);
            console.log('funeral_date vals:', row.funeral_date);

            const mDate = new Date(row.created_at);
            const fDate = new Date(row.funeral_date);
            console.log('mDate parsed:', mDate.toISOString());
            console.log('fDate parsed:', fDate.toISOString());

            const target = new Date(fDate);
            target.setHours(12, 0, 0, 0);
            console.log('Target date:', target.toISOString());

            const diff = Math.abs(mDate - target);
            console.log('Diff (ms):', diff);
            console.log('Diff > 1 day?', diff > 86400000);
        }

    } catch (err) {
        console.error(err);
    }
    process.exit();
}

debugSemela();
