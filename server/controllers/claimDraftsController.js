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
    let sql = 'SELECT policy_number, updated_at, department FROM claim_drafts';
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

exports.deleteDraft = async (req, res) => {
  try {
    const { policy } = req.params;
    const result = await query('DELETE FROM claim_drafts WHERE policy_number = $1 RETURNING *', [policy]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Draft not found' });
    res.json({ success: true, deleted: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
