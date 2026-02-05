const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function restoreDrafts() {
    try {
        const restorations = [
            { policy: '801763', created_at: '2025-12-08 07:23:29.849839' },
            { policy: '864706', created_at: '2025-12-08 07:34:06.349942' },
            { policy: '795269', created_at: '2025-12-09 10:17:26.629119' }
        ];

        for (const item of restorations) {
            // 1. Restore claim_drafts
            await pool.query(`
        UPDATE claim_drafts 
        SET created_at = $1 
        WHERE policy_number = $2
      `, [item.created_at, item.policy]);

            console.log(`✅ Restored draft ${item.policy} to ${item.created_at}`);

            // 2. Sync airtime_requests
            await pool.query(`
        UPDATE airtime_requests 
        SET requested_at = $1 
        WHERE policy_number = $2 AND operator_notes = 'Auto from claim draft'
      `, [item.created_at, item.policy]);

            console.log(`✅ Synced airtime request ${item.policy}`);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

restoreDrafts();
