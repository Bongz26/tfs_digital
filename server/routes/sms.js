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
  try {
    await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_airtime_requests_unique ON airtime_requests (policy_number, network, phone_number)`);
  } catch (_) {}
}

async function normalizeAndDeduplicateAirtimeRequests() {
  await ensureAirtimeTable();
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
        PARTITION BY UPPER(TRIM(policy_number)), UPPER(TRIM(network)), TRIM(phone_number)
        ORDER BY requested_at DESC
      ) rn
      FROM airtime_requests
    ) d
    WHERE ar.id = d.id AND d.rn > 1
  `);
  try {
    await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_airtime_requests_unique ON airtime_requests (policy_number, network, phone_number)`);
  } catch (_) {}
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
    WHERE requested_at::date < CURRENT_DATE
    ON CONFLICT (original_id) DO NOTHING
  `);
  const del = await query(`DELETE FROM airtime_requests WHERE requested_at::date < CURRENT_DATE`);
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
    Ivory: 200
  };
  const k = String(name || '').trim();
  return m[k] || 0;
}

async function generateAirtimeRequestsFromDrafts() {
  await ensureAirtimeTable();
  try {
    const exists = await query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_name = 'claim_drafts'
       ) AS ex`
    );
    if (!exists.rows[0]?.ex) {
      return;
    }
    const drafts = await query(
      `SELECT policy_number, data FROM claim_drafts
       WHERE (data->>'status') = 'claim_draft'
         AND COALESCE((data->>'airtime') = 'true', false)
         AND NULLIF(TRIM(data->>'airtime_network'), '') IS NOT NULL
         AND NULLIF(TRIM(data->>'airtime_number'), '') IS NOT NULL`
    );
    for (const row of drafts.rows) {
      const d = row.data || {};
      const network = String(d.airtime_network || '').trim();
      const phone = String(d.airtime_number || '').trim();
      const exists = await query(
        `SELECT id FROM airtime_requests WHERE policy_number = $1 AND phone_number = $2 AND network = $3`,
        [row.policy_number || null, phone, network]
      );
      if (exists.rows.length > 0) continue;
      const amount = getPlanAirtimeAmount(d.plan_name) || 0;
      const res = await query(
        `INSERT INTO airtime_requests (
          case_id, policy_number, beneficiary_name, network, phone_number, amount,
        status, requested_by, requested_by_email, requested_by_role, operator_notes, operator_phone
      ) VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9,$10,$11)
      RETURNING *`,
      [
        null,
        row.policy_number || null,
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
  } catch (_) {
    return;
  }
}

async function generateAirtimeRequestsFromCases() {
  await ensureAirtimeTable();
  try {
    const cases = await query(
      `SELECT id, policy_number, nok_name, plan_name, airtime, airtime_network, airtime_number
       FROM cases
       WHERE airtime = true
         AND NULLIF(TRIM(airtime_network), '') IS NOT NULL
         AND NULLIF(TRIM(airtime_number), '') IS NOT NULL`
    );
    for (const c of cases.rows) {
      const network = String(c.airtime_network || '').trim();
      const phone = String(c.airtime_number || '').trim();
      const exists = await query(
        `SELECT id FROM airtime_requests WHERE policy_number = $1 AND phone_number = $2 AND network = $3`,
        [c.policy_number || null, phone, network]
      );
      if (exists.rows.length > 0) continue;
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
          'Auto from case scan',
          null
        ]
      );
    }
  } catch (_) {
    return;
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
    await normalizeAndDeduplicateAirtimeRequests();
    await archiveOldAirtimeRequests();
    const result = await query(`
      WITH d AS (
        SELECT *, ROW_NUMBER() OVER (
          PARTITION BY UPPER(TRIM(policy_number)), UPPER(TRIM(network)), TRIM(phone_number)
          ORDER BY requested_at DESC
        ) rn
        FROM airtime_requests
      )
      SELECT d.*, c.case_number, c.deceased_name
      FROM d
      LEFT JOIN cases c ON d.case_id = c.id
      WHERE d.rn = 1
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
    const allowed = ['pending','sent','failed','cancelled'];
    if (!allowed.includes(String(status || '').toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
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

