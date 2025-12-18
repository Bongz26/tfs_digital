// server/routes/sms.js
const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { requireMinRole } = require('../middleware/auth');
const nodemailer = require('nodemailer');

let emailTransporter = null;
function getEmailTransporter() {
  if (emailTransporter) return emailTransporter;
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '0', 10) || 0;
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  emailTransporter = nodemailer.createTransport({ host, port: port || 587, secure, auth: { user, pass } });
  return emailTransporter;
}

async function sendAirtimeEmail(payload) {
  const to = process.env.AIRTIME_OPERATOR_EMAIL;
  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || 'no-reply@tfs.local';
  const transporter = getEmailTransporter();
  if (!to || !transporter) return { queued: false };
  const subject = `Airtime Request: Policy ${payload.policy_number || '-'}`;
  const text = `Policy: ${payload.policy_number || '-'}\nBeneficiary: ${payload.beneficiary_name || '-'}\nNetwork: ${payload.network}\nNumber: ${payload.phone_number}\nAmount: R${(parseFloat(payload.amount || 0) || 0).toFixed(2)}\nRequested By: ${payload.requested_by_email || '-'} (${payload.requested_by_role || '-'})\nNotes: ${payload.notes || ''}`;
  const info = await transporter.sendMail({ to, from, subject, text });
  return { queued: true, messageId: info.messageId };
}

// Get all SMS logs
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT sms.*, c.case_number, c.deceased_name
       FROM sms_log sms
       LEFT JOIN cases c ON sms.case_id = c.id
       ORDER BY sms.sent_at DESC`
    );
    res.json({ success: true, messages: result.rows });
  } catch (error) {
    console.error('Error fetching SMS logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get SMS logs for a case
router.get('/case/:caseId', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM sms_log WHERE case_id = $1 ORDER BY sent_at DESC`,
      [req.params.caseId]
    );
    res.json({ success: true, messages: result.rows });
  } catch (error) {
    console.error('Error fetching case SMS logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single SMS log
router.get('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id || '');
    if (!/^\d+$/.test(id)) return next();
    const result = await query(
      `SELECT sms.*, c.case_number, c.deceased_name
       FROM sms_log sms
       LEFT JOIN cases c ON sms.case_id = c.id
       WHERE sms.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'SMS log not found' });
    }
    res.json({ success: true, message: result.rows[0] });
  } catch (error) {
    console.error('Error fetching SMS log:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create SMS log entry
router.post('/', async (req, res) => {
  try {
    const { case_id, phone, message, status } = req.body;

    // Verify case exists if case_id is provided
    if (case_id) {
      const caseResult = await query('SELECT id FROM cases WHERE id = $1', [case_id]);
      if (caseResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Case not found' });
      }
    }

    const result = await query(
      `INSERT INTO sms_log (case_id, phone, message, sent_at, status)
       VALUES ($1, $2, $3, NOW(), $4)
       RETURNING *`,
      [case_id || null, phone, message, status || 'sent']
    );

    res.status(201).json({ success: true, message: result.rows[0] });
  } catch (error) {
    console.error('Error creating SMS log:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update SMS log status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const result = await query(
      `UPDATE sms_log SET status = $1 WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'SMS log not found' });
    }
    res.json({ success: true, message: result.rows[0] });
  } catch (error) {
    console.error('Error updating SMS log status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send SMS (placeholder - integrate with actual SMS service)
router.post('/send', async (req, res) => {
  try {
    const { case_id, phone, message } = req.body;

    // TODO: Integrate with actual SMS service (e.g., Twilio, AWS SNS, etc.)
    // For now, just log the message

    // Verify case exists if case_id is provided
    if (case_id) {
      const caseResult = await query('SELECT id FROM cases WHERE id = $1', [case_id]);
      if (caseResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Case not found' });
      }
    }

    // Log the SMS
    const logResult = await query(
      `INSERT INTO sms_log (case_id, phone, message, sent_at, status)
       VALUES ($1, $2, $3, NOW(), $4)
       RETURNING *`,
      [case_id || null, phone, message, 'sent']
    );

    // TODO: Actually send the SMS here
    // Example:
    // const smsService = require('../services/smsService');
    // const sendResult = await smsService.sendSMS(phone, message);
    // await query('UPDATE sms_log SET status = $1 WHERE id = $2', [sendResult.status, logResult.rows[0].id]);

    res.status(201).json({
      success: true,
      message: logResult.rows[0],
      note: 'SMS logging enabled. Integrate with SMS service to send actual messages.'
    });
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fix existing airtime requests dates from drafts
router.post('/airtime-requests/fix-dates', requireMinRole('admin'), async (req, res) => {
  try {
    const result = await query(`
      UPDATE airtime_requests ar
      SET requested_at = cd.created_at
      FROM claim_drafts cd
      WHERE ar.policy_number = cd.policy_number
        AND ar.operator_notes = 'Auto from claim draft'
        AND cd.created_at IS NOT NULL
    `);
    res.json({ success: true, updated: result.rowCount || 0 });
  } catch (error) {
    console.error('Error fixing dates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

// --- Airtime Requests ---

// Ensure table exists helper
async function ensureAirtimeTable() {
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
}

async function normalizeAndDeduplicateAirtimeRequests() {
  await ensureAirtimeTable();

  // First, drop the unique index if it exists (to allow deduplication)
  try {
    await query(`DROP INDEX IF EXISTS idx_airtime_requests_unique`);
  } catch (_) { }

  // Normalize fields
  await query(`
    UPDATE airtime_requests
    SET policy_number = TRIM(policy_number),
        network = UPPER(TRIM(network)),
        phone_number = TRIM(phone_number)
  `);

  // Remove duplicates, keep latest by requested_at
  await query(`
    DELETE FROM airtime_requests ar
    USING (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY UPPER(REGEXP_REPLACE(policy_number, '\s+', '', 'g')), UPPER(TRIM(network)), REGEXP_REPLACE(TRIM(phone_number), '\s+', '', 'g')
        ORDER BY (CASE WHEN status != 'pending' THEN 1 ELSE 0 END) DESC, requested_at DESC
      ) rn
      FROM airtime_requests
    ) d
    WHERE ar.id = d.id AND d.rn > 1
  `);

  // Now create the unique index after deduplication
  try {
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'idx_airtime_requests_unique_norm'
        ) THEN
          CREATE UNIQUE INDEX idx_airtime_requests_unique_norm ON airtime_requests (
            UPPER(REGEXP_REPLACE(policy_number, '\\s+', '', 'g')),
            UPPER(TRIM(network)),
            REGEXP_REPLACE(TRIM(phone_number), '\\s+', '', 'g')
          );
        END IF;
      END $$;
    `);
  } catch (_) { }
}

async function ensureAirtimeArchiveTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS airtime_requests_archive (
      original_id INT PRIMARY KEY,
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
      requested_at TIMESTAMP,
      sent_at TIMESTAMP,
      handled_by UUID,
      operator_phone VARCHAR(50),
      operator_notes TEXT,
      archived_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_airtime_requests_archive_unique ON airtime_requests_archive (policy_number, network, phone_number, requested_at)`);
}

async function archiveOldAirtimeRequests() {
  await ensureAirtimeTable();
  await ensureAirtimeArchiveTable();
  // Archive all requests from before Dec 8, 2025 (pilot data cleanup)
  await query(`
    INSERT INTO airtime_requests_archive (
      original_id, case_id, policy_number, beneficiary_name, network, phone_number, amount,
      status, requested_by, requested_by_email, requested_by_role, requested_at, sent_at,
      handled_by, operator_phone, operator_notes, archived_at
    )
    SELECT id, case_id, policy_number, beneficiary_name, network, phone_number, amount,
           status, requested_by, requested_by_email, requested_by_role, requested_at, sent_at,
           handled_by, operator_phone, operator_notes, NOW()
    FROM airtime_requests
    WHERE requested_at::date < '2025-12-08'
    ON CONFLICT (original_id) DO NOTHING
  `);
  const del = await query(`DELETE FROM airtime_requests WHERE requested_at::date < '2025-12-08'`);
  return { deleted: del.rowCount || 0 };
}

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
    Ivory: 200,
    'Spring A': 100,
    'Spring B': 100
  };
  const k = String(name || '').trim();
  return m[k] || 0;
}

const PLAN_AMOUNT_CASE_SQL = `
  CASE 
    WHEN TRIM(plan_name) = 'Plan A' THEN 100
    WHEN TRIM(plan_name) = 'Plan B' THEN 100
    WHEN TRIM(plan_name) = 'Plan C' THEN 100
    WHEN TRIM(plan_name) = 'Plan D' THEN 200
    WHEN TRIM(plan_name) = 'Plan E' THEN 200
    WHEN TRIM(plan_name) = 'Plan F' THEN 200
    WHEN TRIM(plan_name) = 'Silver' THEN 100
    WHEN TRIM(plan_name) = 'Gold' THEN 200
    WHEN TRIM(plan_name) = 'Platinum' THEN 200
    WHEN TRIM(plan_name) = 'Black' THEN 200
    WHEN TRIM(plan_name) = 'Pearl' THEN 200
    WHEN TRIM(plan_name) = 'Ivory' THEN 200
    WHEN TRIM(plan_name) = 'Spring A' THEN 100
    WHEN TRIM(plan_name) = 'Spring B' THEN 100
    ELSE 0 
  END
`;

const PLAN_AMOUNT_JSON_SQL = `
  CASE 
    WHEN TRIM(data->>'plan_name') = 'Plan A' THEN 100
    WHEN TRIM(data->>'plan_name') = 'Plan B' THEN 100
    WHEN TRIM(data->>'plan_name') = 'Plan C' THEN 100
    WHEN TRIM(data->>'plan_name') = 'Plan D' THEN 200
    WHEN TRIM(data->>'plan_name') = 'Plan E' THEN 200
    WHEN TRIM(data->>'plan_name') = 'Plan F' THEN 200
    WHEN TRIM(data->>'plan_name') = 'Silver' THEN 100
    WHEN TRIM(data->>'plan_name') = 'Gold' THEN 200
    WHEN TRIM(data->>'plan_name') = 'Platinum' THEN 200
    WHEN TRIM(data->>'plan_name') = 'Black' THEN 200
    WHEN TRIM(data->>'plan_name') = 'Pearl' THEN 200
    WHEN TRIM(data->>'plan_name') = 'Ivory' THEN 200
    WHEN TRIM(data->>'plan_name') = 'Spring A' THEN 100
    WHEN TRIM(data->>'plan_name') = 'Spring B' THEN 100
    ELSE 0 
  END
`;

async function generateAirtimeRequestsFromDrafts() {
  await ensureAirtimeTable();
  await ensureAirtimeArchiveTable();
  try {
    // Check table exists logic preserved
    const exists = await query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_name = 'claim_drafts'
       ) AS ex`
    );
    if (!exists.rows[0]?.ex) return;

    await query(`
      INSERT INTO airtime_requests (
        case_id, policy_number, beneficiary_name, network, phone_number, amount,
        status, requested_by, requested_by_email, requested_by_role, operator_notes, operator_phone, requested_at
      )
      SELECT 
        (SELECT id FROM cases WHERE cases.policy_number = cd.policy_number LIMIT 1),
        cd.policy_number, 
        cd.data->>'nok_name', 
        TRIM(cd.data->>'airtime_network'), 
        TRIM(cd.data->>'airtime_number'),
        ${PLAN_AMOUNT_JSON_SQL},
        'pending', null, null, 'Auto from claim draft', null, null,
        cd.created_at
      FROM claim_drafts cd
      WHERE (cd.data->>'status') = 'claim_draft'
        AND COALESCE((cd.data->>'airtime') = 'true', false)
        AND NULLIF(TRIM(cd.data->>'airtime_network'), '') IS NOT NULL
        AND NULLIF(TRIM(cd.data->>'airtime_number'), '') IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM airtime_requests ar
          WHERE UPPER(REGEXP_REPLACE(ar.policy_number, '\s+', '', 'g')) = UPPER(REGEXP_REPLACE(cd.policy_number, '\s+', '', 'g'))
            AND REGEXP_REPLACE(TRIM(ar.phone_number), '\s+', '', 'g') = REGEXP_REPLACE(TRIM(cd.data->>'airtime_number'), '\s+', '', 'g') 
            AND UPPER(TRIM(ar.network)) = UPPER(TRIM(cd.data->>'airtime_network'))
        )
        AND NOT EXISTS (
          SELECT 1 FROM airtime_requests_archive ara
          WHERE UPPER(REGEXP_REPLACE(ara.policy_number, '\s+', '', 'g')) = UPPER(REGEXP_REPLACE(cd.policy_number, '\s+', '', 'g'))
            AND REGEXP_REPLACE(TRIM(ara.phone_number), '\s+', '', 'g') = REGEXP_REPLACE(TRIM(cd.data->>'airtime_number'), '\s+', '', 'g')
            AND UPPER(TRIM(ara.network)) = UPPER(TRIM(cd.data->>'airtime_network'))
        )
    `);
  } catch (e) {
    console.error('Error in generateAirtimeRequestsFromDrafts:', e.message);
  }
}

async function generateAirtimeRequestsFromCases() {
  await ensureAirtimeTable();
  await ensureAirtimeArchiveTable();
  try {
    await query(`
      INSERT INTO airtime_requests (
        case_id, policy_number, beneficiary_name, network, phone_number, amount,
        status, requested_by, requested_by_email, requested_by_role, operator_notes, operator_phone
      )
      SELECT 
        id, policy_number, nok_name, TRIM(airtime_network), TRIM(airtime_number), 
        ${PLAN_AMOUNT_CASE_SQL},
        'pending', null, null, 'Auto from case scan', null, null
      FROM cases c
      WHERE c.airtime = true 
        AND NULLIF(TRIM(c.airtime_network), '') IS NOT NULL
        AND NULLIF(TRIM(c.airtime_number), '') IS NOT NULL
        AND c.status NOT IN ('completed','cancelled','archived')
        AND NOT EXISTS (
          SELECT 1 FROM airtime_requests ar 
          WHERE (ar.case_id = c.id)
             OR (
                  UPPER(REGEXP_REPLACE(ar.policy_number, '\s+', '', 'g')) = UPPER(REGEXP_REPLACE(c.policy_number, '\s+', '', 'g'))
                  AND REGEXP_REPLACE(TRIM(ar.phone_number), '\s+', '', 'g') = REGEXP_REPLACE(TRIM(c.airtime_number), '\s+', '', 'g') 
                  AND UPPER(TRIM(ar.network)) = UPPER(TRIM(c.airtime_network))
             )
        )
        AND NOT EXISTS (
          SELECT 1 FROM airtime_requests_archive ara
          WHERE UPPER(REGEXP_REPLACE(ara.policy_number, '\s+', '', 'g')) = UPPER(REGEXP_REPLACE(c.policy_number, '\s+', '', 'g'))
            AND REGEXP_REPLACE(TRIM(ara.phone_number), '\s+', '', 'g') = REGEXP_REPLACE(TRIM(c.airtime_number), '\s+', '', 'g')
            AND UPPER(TRIM(ara.network)) = UPPER(TRIM(c.airtime_network))
        )
    `);
  } catch (e) {
    console.error('Error in generateAirtimeRequestsFromCases:', e.message);
  }
}

// Create airtime request
router.post('/airtime-requests', requireMinRole('staff'), async (req, res) => {
  try {
    await ensureAirtimeTable();
    let { case_id, policy_number, beneficiary_name, network, phone_number, amount, notes } = req.body;

    network = String(network || '').trim();
    phone_number = String(phone_number || '').trim();

    if (!phone_number || !network) {
      return res.status(400).json({ success: false, error: 'network and phone_number are required' });
    }

    if (case_id) {
      const c = await query('SELECT id FROM cases WHERE id = $1', [case_id]);
      if (c.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Case not found' });
      }
    }

    const user = req.user || {};
    const operatorPhone = null;

    const dupe = await query(
      `SELECT * FROM airtime_requests WHERE policy_number = $1 AND phone_number = $2 AND network = $3 LIMIT 1`,
      [policy_number || null, phone_number, network]
    );
    if (dupe.rows.length > 0) {
      return res.status(200).json({ success: true, request: dupe.rows[0] });
    }

    const result = await query(
      `INSERT INTO airtime_requests (
        case_id, policy_number, beneficiary_name, network, phone_number, amount,
        status, requested_by, requested_by_email, requested_by_role, operator_notes, operator_phone
      ) VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9,$10,$11)
      RETURNING *`,
      [
        case_id || null,
        policy_number || null,
        beneficiary_name || null,
        network,
        phone_number,
        parseFloat(amount || 0) || 0,
        user.id || null,
        user.email || null,
        user.role || null,
        notes || null,
        operatorPhone
      ]
    );



    res.status(201).json({ success: true, request: result.rows[0] });
  } catch (error) {
    console.error('Error creating airtime request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// List airtime requests
router.get('/airtime-requests', requireMinRole('staff'), async (req, res) => {
  try {
    await generateAirtimeRequestsFromCases();
    await generateAirtimeRequestsFromDrafts();
    await normalizeAndDeduplicateAirtimeRequests();
    await archiveOldAirtimeRequests();
    const result = await query(`
      WITH d AS (
        SELECT *, ROW_NUMBER() OVER (
          PARTITION BY UPPER(REGEXP_REPLACE(policy_number, '\s+', '', 'g')), UPPER(TRIM(network)), REGEXP_REPLACE(TRIM(phone_number), '\s+', '', 'g')
          ORDER BY (CASE WHEN status != 'pending' THEN 1 ELSE 0 END) DESC, requested_at DESC
        ) rn
        FROM airtime_requests
      )
      SELECT 
        d.*,
        COALESCE(d.case_id, c_match.id) as case_id,
        c_match.case_number, 
        c_match.deceased_name, 
        c_match.status AS case_status
      FROM d
      LEFT JOIN LATERAL (
          SELECT c.id, c.case_number, c.deceased_name, c.status
          FROM cases c
          WHERE (c.id = d.case_id) 
             OR (d.case_id IS NULL AND c.policy_number = d.policy_number)
          ORDER BY 
            (CASE WHEN c.id = d.case_id THEN 0 ELSE 1 END) ASC, -- Prioritize exact case_id match
            (CASE WHEN c.status = 'confirmed' THEN 0 WHEN c.status = 'scheduled' THEN 1 ELSE 2 END) ASC, -- Then active statuses
            c.created_at DESC -- Then latest
          LIMIT 1
      ) c_match ON TRUE
      ORDER BY d.requested_at DESC
    `);
    res.json({ success: true, requests: result.rows });
  } catch (error) {
    console.error('Error listing airtime requests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/airtime-requests/archive-old', requireMinRole('staff'), async (req, res) => {
  try {
    const result = await archiveOldAirtimeRequests();
    res.json({ success: true, archived: result.deleted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update airtime request status
router.patch('/airtime-requests/:id/status', requireMinRole('staff'), async (req, res) => {
  try {
    await ensureAirtimeTable();
    const { status, operator_notes } = req.body;
    const user = req.user || {};
    const allowed = ['pending', 'sent', 'failed', 'cancelled'];
    if (!allowed.includes(String(status || '').toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    if (!operator_notes || String(operator_notes).trim().length < 2) {
      return res.status(400).json({ success: false, error: 'operator_notes is required' });
    }
    const sentAt = String(status).toLowerCase() === 'sent' ? 'NOW()' : null;
    const result = await query(
      `UPDATE airtime_requests 
       SET status = $1, operator_notes = COALESCE($2, operator_notes), handled_by = $3, sent_at = ${sentAt ? sentAt : 'sent_at'}
       WHERE id = $4
       RETURNING *`,
      [status, operator_notes || null, user.id || null, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }
    res.json({ success: true, request: result.rows[0] });
  } catch (error) {
    console.error('Error updating airtime status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fix existing airtime requests to have case_ids
router.post('/airtime-requests/fix-case-ids', requireMinRole('admin'), async (req, res) => {
  try {
    await ensureAirtimeTable();
    const result = await query(`
      UPDATE airtime_requests ar
      SET case_id = c.id
      FROM cases c
      WHERE ar.policy_number = c.policy_number
        AND ar.case_id IS NULL
        AND ar.policy_number IS NOT NULL
    `);
    res.json({ success: true, updated: result.rowCount || 0 });
  } catch (error) {
    console.error('Error fixing case IDs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Status endpoint to check airtime requests setup
router.get('/airtime-requests/status', requireMinRole('staff'), async (req, res) => {
  try {
    await ensureAirtimeTable();

    // Count total requests
    const total = await query(`SELECT COUNT(*) as count FROM airtime_requests`);

    // Count requests with case_id
    const withCaseId = await query(`SELECT COUNT(*) as count FROM airtime_requests WHERE case_id IS NOT NULL`);

    // Count requests without case_id
    const withoutCaseId = await query(`SELECT COUNT(*) as count FROM airtime_requests WHERE case_id IS NULL`);

    // Count by date
    const byDate = await query(`
      SELECT requested_at::date as date, COUNT(*) as count 
      FROM airtime_requests 
      GROUP BY requested_at::date 
      ORDER BY date DESC 
      LIMIT 10
    `);

    // Sample requests
    const samples = await query(`
      SELECT id, policy_number, case_id, requested_at, operator_notes
      FROM airtime_requests 
      ORDER BY requested_at DESC 
      LIMIT 5
    `);

    res.json({
      success: true,
      status: {
        total: parseInt(total.rows[0]?.count || 0),
        withCaseId: parseInt(withCaseId.rows[0]?.count || 0),
        withoutCaseId: parseInt(withoutCaseId.rows[0]?.count || 0),
        byDate: byDate.rows,
        samples: samples.rows
      }
    });
  } catch (error) {
    console.error('Error getting airtime status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

