// server/routes/checklist.js
const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

// Get checklist for a case
router.get('/case/:caseId', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM checklist WHERE case_id = $1 ORDER BY id`,
      [req.params.caseId]
    );
    res.json({ success: true, checklist: result.rows });
  } catch (error) {
    console.error('Error fetching checklist:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single checklist item
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM checklist WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Checklist item not found' });
    }
    res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('Error fetching checklist item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create checklist item
router.post('/', async (req, res) => {
  try {
    const { case_id, task, completed, completed_by } = req.body;

    // Verify case exists
    const caseResult = await query('SELECT id FROM cases WHERE id = $1', [case_id]);
    if (caseResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Case not found' });
    }

    const result = await query(
      `INSERT INTO checklist (case_id, task, completed, completed_at, completed_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        case_id,
        task,
        completed || false,
        completed ? new Date() : null,
        completed_by || null
      ]
    );

    res.status(201).json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('Error creating checklist item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create multiple checklist items for a case
router.post('/case/:caseId/bulk', async (req, res) => {
  try {
    const { tasks } = req.body; // Array of task strings
    const caseId = req.params.caseId;

    // Verify case exists
    const caseResult = await query('SELECT id FROM cases WHERE id = $1', [caseId]);
    if (caseResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Case not found' });
    }

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ success: false, error: 'Tasks must be a non-empty array' });
    }

    // Insert all tasks
    const insertedItems = [];
    for (const task of tasks) {
      const result = await query(
        `INSERT INTO checklist (case_id, task, completed)
         VALUES ($1, $2, false)
         RETURNING *`,
        [caseId, task]
      );
      insertedItems.push(result.rows[0]);
    }

    res.status(201).json({ success: true, items: insertedItems });
  } catch (error) {
    console.error('Error creating bulk checklist items:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update checklist item
router.put('/:id', async (req, res) => {
  try {
    const { task, completed, completed_by } = req.body;
    const itemId = req.params.id;

    const result = await query(
      `UPDATE checklist 
       SET task = COALESCE($1, task),
           completed = COALESCE($2, completed),
           completed_at = CASE 
             WHEN $2 = true THEN NOW()
             WHEN $2 = false THEN NULL
             ELSE completed_at
           END,
           completed_by = CASE 
             WHEN $2 = true THEN COALESCE($3, completed_by)
             WHEN $2 = false THEN NULL
             ELSE completed_by
           END
       WHERE id = $4
       RETURNING *`,
      [task, completed, completed_by, itemId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Checklist item not found' });
    }

    res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('Error updating checklist item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Toggle checklist item completion
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { completed_by } = req.body;
    const itemId = req.params.id;

    // Get current state
    const currentResult = await query('SELECT completed FROM checklist WHERE id = $1', [itemId]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Checklist item not found' });
    }

    const newCompleted = !currentResult.rows[0].completed;

    const result = await query(
      `UPDATE checklist 
       SET completed = $1,
           completed_at = CASE WHEN $1 = true THEN NOW() ELSE NULL END,
           completed_by = CASE WHEN $1 = true THEN $2 ELSE NULL END
       WHERE id = $3
       RETURNING *`,
      [newCompleted, completed_by, itemId]
    );

    res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('Error toggling checklist item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete checklist item
router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM checklist WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Checklist item not found' });
    }
    res.json({ success: true, message: 'Checklist item deleted successfully' });
  } catch (error) {
    console.error('Error deleting checklist item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

