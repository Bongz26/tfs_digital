const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/tfs_digital'
});

async function run() {
    try {
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'stock_movements'
    `);
        console.log('stock_movements columns:', res.rows);

        const countRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM stock_movements`);
        console.log('stock_movements count:', countRes.rows[0]);

        const sample = await pool.query(`
          SELECT sm.id, sm.inventory_id, sm.case_id, sm.movement_type, sm.quantity_change, sm.previous_quantity, sm.new_quantity, sm.reason, sm.recorded_by, sm.created_at
          FROM stock_movements sm
          ORDER BY sm.created_at DESC
          LIMIT 5
        `);
        console.log('stock_movements sample:', sample.rows);

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
