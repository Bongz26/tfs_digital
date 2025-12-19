const { query } = require('./config/db');

async function checkSchema() {
    try {
        let output = '';
        const tables = ['cases', 'roster', 'stock_movements', 'purchase_orders', 'inventory'];
        for (const table of tables) {
            console.log(`\n--- TABLE: ${table} ---`);
            const res = await query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [table]);
            if (res.rows.length === 0) {
                output += 'Table not found or no columns.\n';
            } else {
                res.rows.forEach(r => {
                    output += `${r.column_name.padEnd(20)} | ${r.data_type.padEnd(15)} | ${r.is_nullable} | ${r.column_default}\n`;
                });
            }
        }
        require('fs').writeFileSync('schema_audit.txt', output);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkSchema();
