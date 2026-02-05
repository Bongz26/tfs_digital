// server/database/archive-data.js
require('dotenv').config();
const { getClient } = require('../config/db');

async function archiveExistingData() {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const casesToArchiveRes = await client.query(
      `SELECT id FROM cases WHERE status NOT IN ('archived','cancelled')`
    );
    const caseIds = casesToArchiveRes.rows.map(r => r.id);

    if (caseIds.length === 0) {
      console.log('ℹ️ No cases to archive');
      await client.query('ROLLBACK');
      return;
    }

    console.log(`📦 Archiving ${caseIds.length} case(s)`);

    await client.query(
      `UPDATE cases SET status = 'archived' WHERE id = ANY($1::int[])`,
      [caseIds]
    );

    const rosterUpdate = await client.query(
      `UPDATE roster SET status = 'completed'
       WHERE case_id = ANY($1::int[]) AND status <> 'completed'`
      ,[caseIds]
    );
    console.log(`🚗 Completed ${rosterUpdate.rowCount} roster assignment(s)`);

    const vehiclesUpdate = await client.query(
      `UPDATE vehicles SET available = true 
       WHERE id IN (
         SELECT DISTINCT vehicle_id FROM roster WHERE case_id = ANY($1::int[]) AND vehicle_id IS NOT NULL
       )`
      ,[caseIds]
    );
    console.log(`🛠️ Marked ${vehiclesUpdate.rowCount} vehicle(s) available`);

    const reservationsUpdate = await client.query(
      `UPDATE reservations SET released_at = NOW()
       WHERE case_id = ANY($1::int[]) AND released_at IS NULL`
      ,[caseIds]
    );
    console.log(`📦 Released ${reservationsUpdate.rowCount} reservation(s)`);

    await client.query('COMMIT');
    console.log('✅ Archive completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Archive failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  archiveExistingData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { archiveExistingData };
