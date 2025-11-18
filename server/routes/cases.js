const express = require('express');
const router = express.Router();
const { query, getClient } = require('../config/db');

// GET all cases
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM cases ORDER BY funeral_date DESC');
    res.json({ success: true, cases: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch cases' });
  }
});

// POST new case
router.post('/', async (req, res) => {
  const {
    case_number, deceased_name, deceased_id, nok_name, nok_contact, nok_relation,
    plan_category, plan_name, plan_members, plan_age_bracket,
    funeral_date, funeral_time, venue_name, venue_address, venue_lat, venue_lng,
    requires_cow, requires_tombstone, service_type, total_price, casket_type,
    casket_colour, delivery_date, delivery_time
  } = req.body;

  try {
    const result = await query(
      `INSERT INTO cases 
       (case_number, deceased_name, deceased_id, nok_name, nok_contact, nok_relation,
        plan_category, plan_name, plan_members, plan_age_bracket,
        funeral_date, funeral_time, venue_name, venue_address, venue_lat, venue_lng,
        requires_cow, requires_tombstone, service_type, total_price,
        casket_type, casket_colour, delivery_date, delivery_time)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
       RETURNING *`,
      [case_number, deceased_name, deceased_id, nok_name, nok_contact, nok_relation,
       plan_category, plan_name, plan_members, plan_age_bracket,
       funeral_date, funeral_time, venue_name, venue_address, venue_lat, venue_lng,
       requires_cow, requires_tombstone, service_type, total_price,
       casket_type, casket_colour, delivery_date, delivery_time]
    );
    res.json({ success: true, case: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to create case' });
  }
});

// POST assign vehicle to case (creates roster entry)
router.post('/assign/:caseId', async (req, res) => {
  const { caseId } = req.params;
  const { vehicle_id, driver_name, pickup_time } = req.body;

  if (!vehicle_id) {
    return res.status(400).json({ success: false, error: 'vehicle_id is required' });
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Verify case exists
    const caseResult = await client.query('SELECT id, case_number FROM cases WHERE id = $1', [caseId]);
    if (caseResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Case not found' });
    }

    // 2. Verify vehicle exists and is available
    const vehicleResult = await client.query(
      'SELECT id, reg_number, type, available FROM vehicles WHERE id = $1', 
      [vehicle_id]
    );
    if (vehicleResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    const vehicle = vehicleResult.rows[0];
    
    // Check if vehicle is already assigned to another case
    if (!vehicle.available) {
      const assignedCase = await client.query(
        'SELECT case_id FROM roster WHERE vehicle_id = $1 AND case_id != $2',
        [vehicle_id, caseId]
      );
      if (assignedCase.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false, 
          error: 'Vehicle is already assigned to another case' 
        });
      }
    }

    // 2a. Verify driver exists (if provided)
    if (driver_name && driver_name !== 'TBD' && driver_name.trim() !== '') {
      const driverResult = await client.query(
        'SELECT id, name FROM drivers WHERE name = $1 AND active = true',
        [driver_name.trim()]
      );
      if (driverResult.rows.length === 0) {
        // Driver doesn't exist in database, but we'll still allow it (might be a new driver)
        console.log(`⚠️  Driver "${driver_name}" not found in drivers table, but allowing assignment`);
      }
    }

    // 3. Check if roster entry already exists for this case
    const existingRoster = await client.query(
      'SELECT id FROM roster WHERE case_id = $1',
      [caseId]
    );

    // Use provided driver_name or default to 'TBD'
    const assignedDriver = driver_name && driver_name.trim() !== '' 
      ? driver_name.trim() 
      : 'TBD';

    let rosterEntry;
    if (existingRoster.rows.length > 0) {
      // Update existing roster entry
      rosterEntry = await client.query(
        `UPDATE roster 
         SET vehicle_id = $1, 
             driver_name = $2,
             pickup_time = $3,
             status = 'scheduled'
         WHERE case_id = $4
         RETURNING *`,
        [
          vehicle_id,
          assignedDriver,
          pickup_time || new Date().toISOString(),
          caseId
        ]
      );
    } else {
      // Create new roster entry
      rosterEntry = await client.query(
        `INSERT INTO roster (case_id, vehicle_id, driver_name, pickup_time, status)
         VALUES ($1, $2, $3, $4, 'scheduled')
         RETURNING *`,
        [
          caseId,
          vehicle_id,
          assignedDriver,
          pickup_time || new Date().toISOString()
        ]
      );
    }

    // 4. Update vehicle availability (mark as not available)
    await client.query(
      'UPDATE vehicles SET available = false WHERE id = $1',
      [vehicle_id]
    );

    await client.query('COMMIT');

    console.log(`✅ Vehicle ${vehicle_id} assigned to case ${caseId}`);

    res.json({
      success: true,
      message: 'Vehicle assigned successfully',
      roster: rosterEntry.rows[0]
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error assigning vehicle:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to assign vehicle',
      details: err.message 
    });
  } finally {
    client.release();
  }
});

// PATCH update case status
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  // Validate status
  const validStatuses = ['intake', 'confirmed', 'preparation', 'scheduled', 'in_progress', 'completed', 'archived', 'cancelled'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ 
      success: false, 
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
    });
  }

  try {
    // Verify case exists
    const caseCheck = await query('SELECT id, status FROM cases WHERE id = $1', [id]);
    if (caseCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Case not found' });
    }

    const oldStatus = caseCheck.rows[0].status;

    // Update status
    const result = await query(
      `UPDATE cases 
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    console.log(`✅ Case ${id} status changed: ${oldStatus} → ${status}`);

    res.json({
      success: true,
      message: `Status updated from ${oldStatus} to ${status}`,
      case: result.rows[0]
    });

  } catch (err) {
    console.error('❌ Error updating case status:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update case status',
      details: err.message 
    });
  }
});

// GET single case by ID (must come last to avoid conflicts with /assign/:caseId)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await query('SELECT * FROM cases WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Case not found' 
      });
    }
    
    res.json({ success: true, case: result.rows[0] });
  } catch (err) {
    console.error('Error fetching case:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch case',
      details: err.message 
    });
  }
});

module.exports = router;
