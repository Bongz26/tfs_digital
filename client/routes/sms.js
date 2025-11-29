// server/routes/sms.js
const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

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
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT sms.*, c.case_number, c.deceased_name
       FROM sms_log sms
       LEFT JOIN cases c ON sms.case_id = c.id
       WHERE sms.id = $1`,
      [req.params.id]
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

