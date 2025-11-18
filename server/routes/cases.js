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
      'SELECT id, reg_number, type, driver_name, available FROM vehicles WHERE id = $1', 
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

    // 3. Check if roster entry already exists for this case
    const existingRoster = await client.query(
      'SELECT id FROM roster WHERE case_id = $1',
      [caseId]
    );

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
          driver_name || vehicle.driver_name || 'TBD',
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
          driver_name || vehicle.driver_name || 'TBD',
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

module.exports = router;
