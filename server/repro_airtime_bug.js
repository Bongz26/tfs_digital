
const { query } = require('./config/db');
require('dotenv').config();

// Helper to find a recent/upcoming Wednesday
function getNextWednesday() {
  const d = new Date();
  d.setDate(d.getDate() + ((3 + 7 - d.getDay()) % 7));
  return d.toISOString().split('T')[0];
}

async function testAirtimeBug() {
  console.log('--- Starting Airtime Bug Reproduction (Attempt 3) ---');
  const testPolicy = 'TEST-BUG-003';

  try {
    // 1. Cleanup
    await query('DELETE FROM airtime_requests WHERE policy_number = $1', [testPolicy]);
    await query('DELETE FROM cases WHERE policy_number = $1', [testPolicy]);

    // 2. Insert a test Case with POTENTIAL WHITESPACE in phone number
    console.log('Creating test case with spaces in phone number...');
    const wednesday = getNextWednesday();

    await query(`
      INSERT INTO cases (
        case_number, policy_number, deceased_name, nok_name, status, 
        airtime, airtime_network, airtime_number, claim_date,
        intake_day, delivery_date, delivery_time, service_type
      ) VALUES (
        'BugReproCase3', $1, 'Test Deceased', 'Test Ben', 'active',
        true, 'Vodacom', '072 123 4567', NOW(),
        $2, CURRENT_DATE, '10:00:00', 'funeral'
      )
    `, [testPolicy, wednesday]);

    // 3. Simulate First Load (Generation)
    console.log('Simulating 1st Page Load (Generation)...');

    const PLAN_AMOUNT_CASE_SQL = `CASE WHEN TRIM(plan_name) = 'Plan A' THEN 100 ELSE 100 END`;

    // INSERT (uses TRIM but not REPLACE for spaces)
    const insert1 = await query(`
      INSERT INTO airtime_requests (
        case_id, policy_number, beneficiary_name, network, phone_number, amount,
        status, requested_by, requested_by_email, requested_by_role, operator_notes, operator_phone
      )
      SELECT 
        id, policy_number, nok_name, TRIM(airtime_network), TRIM(airtime_number), 
        ${PLAN_AMOUNT_CASE_SQL},
        'pending', null, null, 'Auto from case scan', null, null
      FROM cases c
      WHERE c.policy_number = '${testPolicy}'
        AND NOT EXISTS (
          SELECT 1 FROM airtime_requests ar 
          WHERE UPPER(TRIM(ar.policy_number)) = UPPER(TRIM(c.policy_number))
            AND TRIM(ar.phone_number) = TRIM(c.airtime_number) 
            AND UPPER(TRIM(ar.network)) = UPPER(TRIM(c.airtime_network))
        )
    `);
    console.log('App Logic Inserted:', insert1.rowCount);

    // DEDUPE (Current Logic)
    await query(`
      UPDATE airtime_requests
      SET policy_number = TRIM(policy_number),
          network = UPPER(TRIM(network)),
          phone_number = TRIM(phone_number)
      WHERE policy_number = '${testPolicy}'
    `);

    await query(`
      DELETE FROM airtime_requests ar
      USING (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY UPPER(TRIM(policy_number)), UPPER(TRIM(network)), TRIM(phone_number)
          ORDER BY (CASE WHEN status != 'pending' THEN 1 ELSE 0 END) DESC, requested_at DESC
        ) rn
        FROM airtime_requests
        WHERE policy_number = '${testPolicy}'
      ) d
      WHERE ar.id = d.id AND d.rn > 1
    `);

    let rows = (await query('SELECT * FROM airtime_requests WHERE policy_number = $1', [testPolicy])).rows;
    if (rows.length !== 1) throw new Error(`Expected 1 row, got ${rows.length}`);
    const originalId = rows[0].id;
    console.log(`Original Request ID: ${originalId}, Phone: '${rows[0].phone_number}', Status: ${rows[0].status}`);

    // 4. Update Status to SENT
    await query("UPDATE airtime_requests SET status = 'sent' WHERE id = $1", [originalId]);
    console.log('Updated Status to SENT.');

    // 4b. MANUALLY SIMULATE USER EDITING CASE PHONE NUMBER (Maybe they removed a space?)
    // OR create a mismatch scenario.
    // If exact match persists, let's see if it deletes.
    // NOTE: The previous logic relied on `TRIM`.

    // 5. Simulate Refresh (Generation Run 2)
    console.log('Simulating 2nd Page Load (Refresh)...');

    const insert2 = await query(`
      INSERT INTO airtime_requests (
        case_id, policy_number, beneficiary_name, network, phone_number, amount,
        status, requested_by, requested_by_email, requested_by_role, operator_notes, operator_phone
      )
      SELECT 
        id, policy_number, nok_name, TRIM(airtime_network), TRIM(airtime_number), 
        ${PLAN_AMOUNT_CASE_SQL},
        'pending', null, null, 'Auto from case scan', null, null
      FROM cases c
      WHERE c.policy_number = '${testPolicy}'
        AND NOT EXISTS (
          SELECT 1 FROM airtime_requests ar 
          WHERE UPPER(TRIM(ar.policy_number)) = UPPER(TRIM(c.policy_number))
            AND TRIM(ar.phone_number) = TRIM(c.airtime_number) 
            AND UPPER(TRIM(ar.network)) = UPPER(TRIM(c.airtime_network))
        )
    `);
    console.log('App Logic Inserted (Round 2):', insert2.rowCount);

    // Dedupe
    const dedupe2 = await query(`
      DELETE FROM airtime_requests ar
      USING (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY UPPER(TRIM(policy_number)), UPPER(TRIM(network)), TRIM(phone_number)
          ORDER BY (CASE WHEN status != 'pending' THEN 1 ELSE 0 END) DESC, requested_at DESC
        ) rn
        FROM airtime_requests
        WHERE policy_number = '${testPolicy}'
      ) d
      WHERE ar.id = d.id AND d.rn > 1
    `);
    console.log('Dedupe Deleted (Round 2):', dedupe2.rowCount);

    // 6. Check Final
    const finalRows = (await query('SELECT * FROM airtime_requests WHERE policy_number = $1', [testPolicy])).rows;
    console.log('Final Rows:', finalRows.length);
    finalRows.forEach(r => console.log(`- ID: ${r.id}, Phone: '${r.phone_number}', Status: ${r.status}`));

    if (finalRows.length === 1 && finalRows[0].status === 'sent') {
      console.log('✅ TEST PASSED: Status is still SENT');
    } else {
      console.log('❌ TEST FAILED: Status reverted or duplicates exist');
    }

  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    process.exit();
  }
}

testAirtimeBug();
