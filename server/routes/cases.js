// server/routes/cases.js
const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

// Generate case number (THS-YYYY-XXX format, e.g., THS-2025-001)
const generateCaseNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `THS-${year}-`;
  
  // Get the highest case number for this year
  const result = await query(
    `SELECT case_number FROM cases 
     WHERE case_number LIKE $1 
     ORDER BY case_number DESC 
     LIMIT 1`,
    [`${prefix}%`]
  );
  
  if (result.rows.length === 0) {
    return `${prefix}001`;
  }
  
  // Extract the number from the last case number (e.g., "001" from "THS-2025-001")
  const lastCaseNumber = result.rows[0].case_number;
  const lastNumber = parseInt(lastCaseNumber.split('-')[2]);
  const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
  
  return `${prefix}${nextNumber}`;
};

// Get all cases
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM cases ORDER BY created_at DESC`
    );
    res.json({ success: true, cases: result.rows });
  } catch (error) {
    console.error('Error fetching cases:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single case by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM cases WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Case not found' });
    }
    res.json({ success: true, case: result.rows[0] });
  } catch (error) {
    console.error('Error fetching case:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create case
router.post('/', async (req, res) => {
  try {
    const {
      deceased_name,
      deceased_id,
      nok_name,
      nok_contact,
      nok_relation,
      plan_category,
      plan_name,
      plan_members,
      plan_age_bracket,
      funeral_date,
      funeral_time,
      venue_name,
      venue_address,
      venue_lat,
      venue_lng,
      requires_cow,
      requires_tombstone,
      status = 'intake',
      intake_day
    } = req.body;

    // Generate case number
    const case_number = await generateCaseNumber();

    // Validate intake_day is Wednesday
    if (intake_day) {
      const dayOfWeek = new Date(intake_day).getDay();
      if (dayOfWeek !== 3) {
        return res.status(400).json({ 
          success: false, 
          error: 'Intake day must be a Wednesday' 
        });
      }
    }

    const result = await query(
      `INSERT INTO cases (
        case_number, deceased_name, deceased_id, nok_name, nok_contact, 
        nok_relation, plan_category, plan_name, plan_members, plan_age_bracket,
        funeral_date, funeral_time, venue_name, venue_address, venue_lat, 
        venue_lng, requires_cow, requires_tombstone, status, intake_day
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        case_number, deceased_name, deceased_id, nok_name, nok_contact,
        nok_relation, plan_category, plan_name, plan_members, plan_age_bracket,
        funeral_date, funeral_time, venue_name, venue_address, venue_lat,
        venue_lng, requires_cow || false, requires_tombstone || false, status, intake_day
      ]
    );

    res.status(201).json({ success: true, case: result.rows[0] });
  } catch (error) {
    console.error('Error creating case:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update case
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    const caseId = req.params.id;

    // Build dynamic update query
    const setClause = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach((key) => {
      if (key !== 'id' && key !== 'case_number' && key !== 'created_at') {
        setClause.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (setClause.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    setClause.push(`updated_at = NOW()`);
    values.push(caseId);

    const result = await query(
      `UPDATE cases SET ${setClause.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Case not found' });
    }

    res.json({ success: true, case: result.rows[0] });
  } catch (error) {
    console.error('Error updating case:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete case
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM cases WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Case not found' });
    }
    res.json({ success: true, message: 'Case deleted successfully' });
  } catch (error) {
    console.error('Error deleting case:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;