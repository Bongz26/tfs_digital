const { query, getClient } = require('../config/db');

const pairs = [
  ['THS-2025-103','THS-2025-107'],
  ['THS-2025-106','THS-2025-109']
];

const present = v => {
  if (v == null) return false;
  if (typeof v === 'string') return String(v).trim() !== '';
  return true;
};

const score = c => {
  let s = 0;
  const base = [
    c.deceased_id, c.case_number, c.policy_number, c.deceased_name,
    c.nok_name, c.nok_contact, c.plan_category, c.plan_name, c.plan_members, c.plan_age_bracket,
    c.funeral_date, c.service_date, c.service_time, c.church_date, c.church_time,
    c.cleansing_date, c.cleansing_time, c.venue_name, c.venue_address, c.venue_lat, c.venue_lng,
    c.service_type, c.total_price, c.casket_type, c.casket_colour, c.delivery_date, c.delivery_time,
    c.intake_day, c.programs, c.top_up_amount, c.airtime, c.airtime_network, c.airtime_number,
    c.cover_amount, c.cashback_amount, c.amount_to_bank, c.legacy_plan_name, c.benefit_mode, c.burial_place
  ];
  for (const f of base) { if (present(f)) s += 1; }
  if (present(c.funeral_time)) s += 2;
  if (present(c.burial_place)) s += 2;
  if (present(c.delivery_date)) s += 2;
  if (present(c.delivery_time)) s += 2;
  if (present(c.venue_name)) s += 2;
  if (present(c.casket_type)) s += 2;
  return s;
};

(async () => {
  const results = [];
  for (const pair of pairs) {
    const res = await query('SELECT * FROM cases WHERE case_number = ANY($1)', [pair]);
    const rows = res.rows || [];
    if (rows.length < 2) continue;
    const notCancelled = rows.filter(r => String(r.status || '').toLowerCase() !== 'cancelled');
    const pool = notCancelled.length ? notCancelled : rows;
    let survivor = pool[0];
    let best = score(survivor);
    for (const r of pool.slice(1)) {
      const sc = score(r);
      const survCreated = survivor.created_at ? new Date(survivor.created_at) : new Date(0);
      const rCreated = r.created_at ? new Date(r.created_at) : new Date(0);
      if (sc > best || (sc === best && rCreated > survCreated)) {
        survivor = r; best = sc;
      }
    }
    const survivor_id = survivor.id;
    const duplicate_ids = rows.map(r => r.id).filter(id => id !== survivor_id);
    if (duplicate_ids.length === 0) continue;
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE roster SET case_id = $1 WHERE case_id = ANY($2)', [survivor_id, duplicate_ids]);
      await client.query('UPDATE stock_movements SET case_id = $1 WHERE case_id = ANY($2)', [survivor_id, duplicate_ids]);
      await client.query("UPDATE audit_log SET resource_id = $1 WHERE resource_type = 'case' AND resource_id = ANY($2)", [survivor_id, duplicate_ids]);
      await client.query('UPDATE cases SET status = $1, updated_at = NOW() WHERE id = ANY($2)', ['archived', duplicate_ids]);
      try {
        await client.query(
          `INSERT INTO audit_log (user_id, user_email, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            null,
            null,
            'script_merge_cases',
            'case',
            survivor_id,
            JSON.stringify({ merged_from: duplicate_ids, case_numbers: pair }),
            JSON.stringify({ survivor_id }),
            null,
            null
          ]
        );
      } catch (_) {}
      await client.query('COMMIT');
      results.push({ pair, survivor_id, archived_ids: duplicate_ids });
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw err;
    } finally {
      client.release();
    }
  }
  console.log(JSON.stringify({ success: true, results }));
  process.exit(0);
})().catch(err => {
  console.error(JSON.stringify({ success: false, error: err.message }));
  process.exit(1);
});

