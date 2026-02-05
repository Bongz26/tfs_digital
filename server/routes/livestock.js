// server/routes/livestock.js
const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

// Get all livestock
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT l.*, c.case_number, c.deceased_name
       FROM livestock l
       LEFT JOIN cases c ON l.assigned_case_id = c.id
       ORDER BY l.tag_id`
    );
    res.json({ success: true, livestock: result.rows });
  } catch (error) {
    console.error('Error fetching livestock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get available livestock
router.get('/available', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM livestock WHERE status = 'available' ORDER BY tag_id`
    );
    res.json({ success: true, livestock: result.rows });
  } catch (error) {
    console.error('Error fetching available livestock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get livestock by case
router.get('/case/:caseId', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM livestock WHERE assigned_case_id = $1`,
      [req.params.caseId]
    );
    res.json({ success: true, livestock: result.rows });
  } catch (error) {
    console.error('Error fetching case livestock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single livestock by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT l.*, c.case_number, c.deceased_name
       FROM livestock l
       LEFT JOIN cases c ON l.assigned_case_id = c.id
       WHERE l.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Livestock not found' });
    }
    res.json({ success: true, livestock: result.rows[0] });
  } catch (error) {
    console.error('Error fetching livestock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create livestock
router.post('/', async (req, res) => {
  try {
    const { tag_id, status, assigned_case_id, breed, location } = req.body;

    // Validate tag_id format (COW-001)
    if (tag_id && !/^COW-\d{3}$/.test(tag_id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Tag ID must be in format COW-XXX (e.g., COW-001)' 
      });
    }

    // If assigning to a case, verify case exists and requires cow
    if (assigned_case_id) {
      const caseResult = await query(
        'SELECT id, requires_cow FROM cases WHERE id = $1',
        [assigned_case_id]
      );
      if (caseResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Case not found' });
      }
      if (!caseResult.rows[0].requires_cow) {
        return res.status(400).json({ 
          success: false, 
          error: 'Case does not require a cow' 
        });
      }
    }

    const result = await query(
      `INSERT INTO livestock (tag_id, status, assigned_case_id, breed, location)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        tag_id,
        status || 'available',
        assigned_case_id || null,
        breed || 'Cow (Generic)',
        location || 'Manekeng Farm'
      ]
    );

    res.status(201).json({ success: true, livestock: result.rows[0] });
  } catch (error) {
    console.error('Error creating livestock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Assign livestock to case
router.post('/:id/assign', async (req, res) => {
  try {
    const { case_id } = req.body;
    const livestockId = req.params.id;

    // Verify case exists and requires cow
    const caseResult = await query(
      'SELECT id, requires_cow FROM cases WHERE id = $1',
      [case_id]
    );
    if (caseResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Case not found' });
    }
    if (!caseResult.rows[0].requires_cow) {
      return res.status(400).json({ 
        success: false, 
        error: 'Case does not require a cow' 
      });
    }

    // Verify livestock is available
    const livestockResult = await query(
      'SELECT id, status FROM livestock WHERE id = $1',
      [livestockId]
    );
    if (livestockResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Livestock not found' });
    }
    if (livestockResult.rows[0].status !== 'available') {
      return res.status(400).json({ 
        success: false, 
        error: 'Livestock is not available' 
      });
    }

    const result = await query(
      `UPDATE livestock 
       SET assigned_case_id = $1, status = 'assigned' 
       WHERE id = $2 
       RETURNING *`,
      [case_id, livestockId]
    );

    res.json({ success: true, livestock: result.rows[0] });
  } catch (error) {
    console.error('Error assigning livestock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update livestock
router.put('/:id', async (req, res) => {
  try {
    const { status, assigned_case_id, breed, location } = req.body;
    const livestockId = req.params.id;

    const result = await query(
      `UPDATE livestock 
       SET status = COALESCE($1, status),
           assigned_case_id = COALESCE($2, assigned_case_id),
           breed = COALESCE($3, breed),
           location = COALESCE($4, location)
       WHERE id = $5
       RETURNING *`,
      [status, assigned_case_id, breed, location, livestockId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Livestock not found' });
    }

    res.json({ success: true, livestock: result.rows[0] });
  } catch (error) {
    console.error('Error updating livestock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Release livestock from case
router.post('/:id/release', async (req, res) => {
  try {
    const result = await query(
      `UPDATE livestock 
       SET assigned_case_id = NULL, status = 'available' 
       WHERE id = $1 
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Livestock not found' });
    }

    res.json({ success: true, livestock: result.rows[0] });
  } catch (error) {
    console.error('Error releasing livestock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

