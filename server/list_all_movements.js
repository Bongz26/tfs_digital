const { query } = require('./config/db');

async function listAll() {
    try {
        const res = await query(`
            SELECT sm.id, sm.created_at, c.deceased_name, c.funeral_date 
            FROM stock_movements sm
            LEFT JOIN cases c ON sm.case_id = c.id
            ORDER BY sm.created_at DESC
        `);
        console.log(`Total Movements: ${res.rows.length}`);
        res.rows.forEach(r => {
            const cDate = new Date(r.created_at).toISOString().slice(0, 10);
            const fDate = r.funeral_date ? new Date(r.funeral_date).toISOString().slice(0, 10) : 'N/A';
            console.log(`[${r.id}] Created: ${cDate} | Funeral: ${fDate} | ${r.deceased_name}`);
        });
    } catch (e) { console.error(e); }
    process.exit();
}
listAll();
