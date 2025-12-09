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
      WHERE table_name = 'claim_drafts'
    `);
        console.log('Columns:', res.rows);

        const drafts = await pool.query(`SELECT * FROM claim_drafts LIMIT 1`);
        console.log('Sample Draft:', drafts.rows[0]);

        // Check if cases exist for the policy numbers seen in the screenshot
        // 795269, 864706, 801763
        const cases = await pool.query(`
      SELECT id, policy_number FROM cases 
      WHERE policy_number IN ('795269', '864706', '801763')
    `);
        console.log('Matching Cases:', cases.rows);

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
