const { query } = require('../config/db');

async function main() {
  console.log('--- Airtime Diagnostics ---');
  await query('CREATE TABLE IF NOT EXISTS airtime_requests (id SERIAL PRIMARY KEY)');

  const casesSql = `
    SELECT id, case_number, policy_number, nok_name, status, claim_date,
           airtime, airtime_network, airtime_number
    FROM cases
    WHERE airtime = true
      AND NULLIF(TRIM(airtime_network), '') IS NOT NULL
      AND NULLIF(TRIM(airtime_number), '') IS NOT NULL
      AND (
        status NOT IN ('completed','cancelled','archived')
        OR (claim_date IS NOT NULL AND claim_date >= CURRENT_DATE - INTERVAL '14 days')
      )
    ORDER BY claim_date DESC NULLS LAST, id DESC
    LIMIT 20
  `;
  const cases = await query(casesSql);
  console.log('Eligible active/recent cases:', cases.rowCount);
  for (const c of cases.rows) {
    console.log(`- Case ${c.case_number || c.id}: status=${c.status} claim_date=${c.claim_date} policy=${c.policy_number} airtime=${c.airtime} ${c.airtime_network}/${c.airtime_number}`);
  }

  const reqSql = `
    SELECT id, policy_number, network, phone_number, status, requested_at
    FROM airtime_requests
    WHERE requested_at::date >= CURRENT_DATE - INTERVAL '14 days'
    ORDER BY requested_at DESC
    LIMIT 20
  `;
  const reqs = await query(reqSql);
  console.log('Recent airtime_requests:', reqs.rowCount);
  for (const r of reqs.rows) {
    console.log(`- Req ${r.id}: ${r.policy_number} ${r.network}/${r.phone_number} status=${r.status} at=${r.requested_at}`);
  }

  const archivedSql = `
    SELECT COUNT(*) AS cnt FROM airtime_requests_archive
  `;
  try {
    const arch = await query(archivedSql);
    console.log('Archived airtime requests:', arch.rows[0]?.cnt);
  } catch (e) {
    console.log('Archived airtime requests: table missing (ok if never archived)');
  }
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });

