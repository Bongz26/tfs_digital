const { query } = require('./config/db');
async function checkCase() {
    const id = 122;
    try {
        const res = await query('SELECT id, status, funeral_time, burial_place, is_yard_burial FROM cases WHERE id = $1', [id]);
        const row = res.rows[0];
        if (row) {
            console.log('--- Case 122 Details ---');
            console.log('ID:', row.id);
            console.log('Status:', row.status);
            console.log('Funeral Time:', `"${row.funeral_time}"`);
            console.log('Burial Place:', `"${row.burial_place}"`);
            console.log('Is Yard Burial:', row.is_yard_burial);
        } else {
            console.log('Case 122 not found');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkCase();
