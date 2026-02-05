const { query } = require('../config/db');

function getPlanAirtimeAmount(name) {
  const m = {
    'Plan A': 100,
    'Plan B': 100,
    'Plan C': 100,
    'Plan D': 200,
    'Plan E': 200,
    'Plan F': 200,
    Silver: 100,
    Gold: 200,
    Platinum: 200,
    Black: 200,
    Pearl: 200,
    Ivory: 200
  };
  const k = String(name || '').trim();
  return m[k] || 0;
}

async function main() {
  await query(`CREATE TABLE IF NOT EXISTS airtime_requests (
    id SERIAL PRIMARY KEY,
    case_id INT,
    policy_number VARCHAR(100),
    beneficiary_name VARCHAR(200),
    network VARCHAR(50),
    phone_number VARCHAR(20),
    amount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    requested_by UUID,
    requested_by_email VARCHAR(200),
    requested_by_role VARCHAR(50),
    requested_at TIMESTAMP DEFAULT NOW(),
    sent_at TIMESTAMP,
    handled_by UUID,
    operator_phone VARCHAR(50),
    operator_notes TEXT
  )`);

  const cases = await query(`
    SELECT id, policy_number, nok_name, plan_name, airtime, airtime_network, airtime_number, status, claim_date
    FROM cases
    WHERE airtime = true
      AND NULLIF(TRIM(airtime_network), '') IS NOT NULL
      AND NULLIF(TRIM(airtime_number), '') IS NOT NULL
      AND (
        status NOT IN ('completed','cancelled','archived')
        OR (claim_date IS NOT NULL AND claim_date >= CURRENT_DATE - INTERVAL '14 days')
      )
  `);

  let created = 0;
  for (const c of cases.rows) {
    const network = String(c.airtime_network || '').trim();
    const phone = String(c.airtime_number || '').trim();
    const dupe = await query(
      `SELECT id FROM airtime_requests WHERE policy_number = $1 AND phone_number = $2 AND network = $3 LIMIT 1`,
      [c.policy_number || null, phone, network]
    );
    if (dupe.rows.length > 0) continue;
    const amount = getPlanAirtimeAmount(c.plan_name) || 0;
    await query(
      `INSERT INTO airtime_requests (
        case_id, policy_number, beneficiary_name, network, phone_number, amount,
        status, requested_by, requested_by_email, requested_by_role, operator_notes, operator_phone
      ) VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9,$10,$11)`,
      [
        c.id || null,
        c.policy_number || null,
        c.nok_name || null,
        network,
        phone,
        parseFloat(amount || 0) || 0,
        null,
        null,
        null,
        'Seeded from active/recent cases',
        null
      ]
    );
    created++;
  }

  const cnt = await query(`SELECT COUNT(*) AS cnt FROM airtime_requests WHERE requested_at::date >= CURRENT_DATE - INTERVAL '14 days'`);
  console.log('Created:', created, 'Recent requests:', cnt.rows[0]?.cnt);
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });

