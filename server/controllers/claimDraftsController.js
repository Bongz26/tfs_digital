const { query } = require('../config/db');

exports.saveDraft = async (req, res) => {
  try {
    const { policy_number, data, department } = req.body;
    if (!policy_number || !data) return res.status(400).json({ success: false, error: 'policy_number and data are required' });
    const result = await query(
      `INSERT INTO claim_drafts (policy_number, data, department)
       VALUES ($1, $2, $3)
       ON CONFLICT (policy_number)
       DO UPDATE SET data = EXCLUDED.data, department = COALESCE(EXCLUDED.department, claim_drafts.department), updated_at = NOW()
       RETURNING *`,
      [policy_number, data, department || null]
    );

    try {
      await query(`
        CREATE TABLE IF NOT EXISTS airtime_requests (
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
        )
      `);
      await query(`ALTER TABLE airtime_requests ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP DEFAULT NOW()`);

      const draft = result.rows[0];
      const d = draft?.data || {};
      const hasAirtime = !!d.airtime;
      const network = (d.airtime_network || '').trim();
      const phone = (d.airtime_number || '').trim();

      if (hasAirtime && network && phone) {
        // Check for any PENDING request for this policy to update instead of creating duplicates
        const existingPending = await query(
          `SELECT id FROM airtime_requests WHERE policy_number = $1 AND status = 'pending'`,
          [policy_number]
        );

        if (existingPending.rows.length > 0) {
          // Update the existing pending request with latest details (in case number/network changed)
          const planAmounts = {
            'Plan A': 100, 'Plan B': 100, 'Plan C': 100, 'Plan D': 200, 'Plan E': 200, 'Plan F': 200,
            Silver: 100, Gold: 200, Platinum: 200, Black: 200, Pearl: 200, Ivory: 200
          };
          const planKey = String(d.plan_name || '').trim();
          const amount = planAmounts[planKey] || 0;

          await query(
            `UPDATE airtime_requests 
             SET phone_number = $1, network = $2, beneficiary_name = $3, amount = $4, updated_at = NOW()
             WHERE id = $5`,
            [phone, network, d.nok_name || null, parseFloat(amount || 0) || 0, existingPending.rows[0].id]
          );
        } else {
          // No pending request, check if we should create one (avoid duplicates if same as completed? No, allow new requests if old ones are done)
          // Actually, strict check: if we have a COMPLETED request for same details, don't duplicate automatically?
          // But maybe they want another one? For now, let's assume auto-generation from draft is only for the INITIAL request.
          // If they want another one, they use the buttons.
          // But let's stick to the 'exists' check for non-pending to be safe, or just insert.

          // Re-using original strict check for non-pending duplicates to be safe, 
          // or just proceed to insert since we handled pending.

          const planAmounts = {
            'Plan A': 100, 'Plan B': 100, 'Plan C': 100, 'Plan D': 200, 'Plan E': 200, 'Plan F': 200,
            Silver: 100, Gold: 200, Platinum: 200, Black: 200, Pearl: 200, Ivory: 200
          };
          const planKey = String(d.plan_name || '').trim();
          const amount = planAmounts[planKey] || 0;

          await query(
            `INSERT INTO airtime_requests (
              case_id, policy_number, beneficiary_name, network, phone_number, amount,
              status, requested_by, requested_by_email, requested_by_role, operator_notes, operator_phone
            ) VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9,$10,$11)`,
            [
              null,
              policy_number,
              d.nok_name || null,
              network,
              phone,
              parseFloat(amount || 0) || 0,
              null,
              null,
              null,
              'Auto from claim draft',
              null
            ]
          );
        }
      }
    } catch (_) { }

    res.status(201).json({ success: true, draft: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getDraft = async (req, res) => {
  try {
    const { policy } = req.params;
    const result = await query('SELECT * FROM claim_drafts WHERE policy_number = $1', [policy]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Draft not found' });
    res.json({ success: true, draft: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getLastDraft = async (req, res) => {
  try {
    const result = await query('SELECT * FROM claim_drafts ORDER BY updated_at DESC LIMIT 1');
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'No drafts' });
    res.json({ success: true, draft: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.listDrafts = async (req, res) => {
  try {
    const { department } = req.query;
    let sql = 'SELECT policy_number, updated_at, department, data FROM claim_drafts';
    const params = [];
    if (department) {
      params.push(department);
      sql += ` WHERE department = $${params.length}`;
    }
    sql += ' ORDER BY updated_at DESC';
    const result = await query(sql, params);
    res.json({ success: true, drafts: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getDraftHistory = async (req, res) => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS claim_draft_deletions (
        id SERIAL PRIMARY KEY,
        policy_number VARCHAR(100) NOT NULL,
        department VARCHAR(50),
        data JSONB,
        deleted_by UUID,
        deleted_by_email VARCHAR(200),
        deleted_by_role VARCHAR(50),
        reason TEXT,
        deleted_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const result = await query(
      `SELECT policy_number, department, deleted_at, reason, data 
       FROM claim_draft_deletions 
       ORDER BY deleted_at DESC 
       LIMIT 50`
    );
    res.json({ success: true, history: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteDraft = async (req, res) => {
  try {
    const { policy } = req.params;
    const reason = (req.body && req.body.reason) ? String(req.body.reason).trim() : '';

    const result = await query('DELETE FROM claim_drafts WHERE policy_number = $1 RETURNING *', [policy]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Draft not found' });

    // Ensure deletion log table exists
    await query(`
      CREATE TABLE IF NOT EXISTS claim_draft_deletions (
        id SERIAL PRIMARY KEY,
        policy_number VARCHAR(100) NOT NULL,
        department VARCHAR(50),
        data JSONB,
        deleted_by UUID,
        deleted_by_email VARCHAR(200),
        deleted_by_role VARCHAR(50),
        reason TEXT,
        deleted_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const deletedRow = result.rows[0];
    const user = req.user || {};
    await query(
      `INSERT INTO claim_draft_deletions (policy_number, department, data, deleted_by, deleted_by_email, deleted_by_role, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        deletedRow.policy_number,
        deletedRow.department || null,
        deletedRow.data || null,
        user.id || null,
        user.email || null,
        user.role || null,
        reason || null
      ]
    );

    res.json({ success: true, deleted: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
