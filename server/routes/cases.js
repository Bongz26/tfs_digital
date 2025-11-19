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
  console.log('📥 [POST /api/cases] Request received at', new Date().toISOString());
  console.log('📦 [POST /api/cases] Request body keys:', Object.keys(req.body));
  console.log('📦 [POST /api/cases] Delivery fields:', {
    delivery_date: req.body.delivery_date,
    delivery_time: req.body.delivery_time
  });

  const {
    case_number, deceased_name, deceased_id, nok_name, nok_contact, nok_relation,
    plan_category, plan_name, plan_members, plan_age_bracket,
    funeral_date, funeral_time, venue_name, venue_address, venue_lat, venue_lng,
    requires_cow, requires_tombstone, service_type, total_price, casket_type,
    casket_colour, delivery_date, delivery_time, intake_day
  } = req.body;

  try {
    // Validate intake_day is required and is a Wednesday
    if (!intake_day) {
      return res.status(400).json({
        success: false,
        error: 'Intake day is required',
        details: 'Intake day must be provided and must be a Wednesday'
      });
    }

    const intakeDate = new Date(intake_day);
    const dayOfWeek = intakeDate.getDay(); // 0 = Sunday, 3 = Wednesday
    if (dayOfWeek !== 3) {
      return res.status(400).json({
        success: false,
        error: 'Intake day must be a Wednesday',
        details: `Selected date ${intake_day} is not a Wednesday`
      });
    }

    // Validate delivery_date and delivery_time are required
    if (!delivery_date) {
      return res.status(400).json({
        success: false,
        error: 'Delivery date is required',
        details: 'Delivery date must be provided'
      });
    }

    if (!delivery_time) {
      return res.status(400).json({
        success: false,
        error: 'Delivery time is required',
        details: 'Delivery time must be provided'
      });
    }

    // Generate case_number if not provided (format: THS-YYYY-XXX)
    let finalCaseNumber = case_number;
    if (!finalCaseNumber) {
      const year = new Date().getFullYear();
      
      // Get the highest case number for this year
      const maxCaseResult = await query(
        `SELECT case_number FROM cases 
         WHERE case_number LIKE $1 
         ORDER BY case_number DESC 
         LIMIT 1`,
        [`THS-${year}-%`]
      );
      
      let nextNumber = 1;
      if (maxCaseResult.rows.length > 0) {
        const lastCaseNumber = maxCaseResult.rows[0].case_number;
        const match = lastCaseNumber.match(/THS-\d{4}-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      
      finalCaseNumber = `THS-${year}-${String(nextNumber).padStart(3, '0')}`;
      console.log('🔢 [POST /api/cases] Generated case_number:', finalCaseNumber);
    }

    console.log('🔍 [POST /api/cases] Attempting to insert case with case_number:', finalCaseNumber);

    const result = await query(
      `INSERT INTO cases 
       (case_number, deceased_name, deceased_id, nok_name, nok_contact, nok_relation,
        plan_category, plan_name, plan_members, plan_age_bracket,
        funeral_date, funeral_time, venue_name, venue_address, venue_lat, venue_lng,
        requires_cow, requires_tombstone, service_type, total_price,
        casket_type, casket_colour, delivery_date, delivery_time, intake_day)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
       RETURNING *`,
      [finalCaseNumber, deceased_name, deceased_id, nok_name, nok_contact, nok_relation,
       plan_category, plan_name, plan_members, plan_age_bracket,
       funeral_date, funeral_time, venue_name, venue_address, venue_lat, venue_lng,
       requires_cow, requires_tombstone, service_type, total_price,
       casket_type, casket_colour, delivery_date, delivery_time, intake_day]
    );
    
    console.log('✅ [POST /api/cases] Case created successfully:', result.rows[0]?.id, result.rows[0]?.case_number);
    res.json({ success: true, case: result.rows[0] });
  } catch (err) {
    console.error('❌ [POST /api/cases] Error creating case:', err);
    console.error('❌ [POST /api/cases] Error details:', {
      message: err.message,
      code: err.code,
      detail: err.detail,
      constraint: err.constraint,
      position: err.position,
      where: err.where
    });
    console.error('❌ [POST /api/cases] Full error object:', JSON.stringify(err, null, 2));
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create case',
      details: err.message,
      code: err.code,
      hint: err.code === '42703' 
        ? 'Missing column in database. Run migration: ALTER TABLE cases ADD COLUMN delivery_date DATE; ALTER TABLE cases ADD COLUMN delivery_time TIME;' 
        : err.code === '23502'
        ? 'Missing required field value'
        : undefined
    });
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

    // 1. Verify case exists and get funeral details including delivery_time
    const caseResult = await client.query(
      'SELECT id, case_number, funeral_date, funeral_time, delivery_date, delivery_time FROM cases WHERE id = $1', 
      [caseId]
    );
    if (caseResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Case not found' });
    }

    const currentCase = caseResult.rows[0];
    const currentFuneralDate = currentCase.funeral_date;
    const currentFuneralTime = currentCase.funeral_time;
    const deliveryDate = currentCase.delivery_date;
    const deliveryTime = currentCase.delivery_time;
    
    // Use delivery_time from case if available, otherwise use provided pickup_time or calculate
    let calculatedPickupTime = pickup_time;
    
    if (deliveryDate && deliveryTime) {
      // Use delivery date and time from case (entered during intake)
      try {
        calculatedPickupTime = new Date(`${deliveryDate}T${deliveryTime}`).toISOString();
        console.log(`📅 Using delivery_time from case: ${calculatedPickupTime} (${deliveryDate} ${deliveryTime})`);
      } catch (err) {
        console.warn('⚠️  Could not parse delivery_time, falling back to calculation');
        calculatedPickupTime = null; // Will fall through to calculation
      }
    }
    
    // Fallback: Calculate from funeral time if delivery_time not available
    if (!calculatedPickupTime && currentFuneralDate && currentFuneralTime) {
      try {
        const funeralDateTime = new Date(`${currentFuneralDate}T${currentFuneralTime}`);
        // Set pickup time to 1.5 hours before funeral time
        calculatedPickupTime = new Date(funeralDateTime.getTime() - (1.5 * 60 * 60 * 1000)).toISOString();
        console.log(`📅 Calculated pickup_time: ${calculatedPickupTime} (1.5 hours before funeral at ${currentFuneralTime})`);
      } catch (err) {
        console.warn('⚠️  Could not calculate pickup_time from funeral time, using provided or current time');
        calculatedPickupTime = pickup_time || new Date().toISOString();
      }
    } else if (!calculatedPickupTime) {
      // Final fallback to current time if nothing available
      calculatedPickupTime = pickup_time || new Date().toISOString();
    }

    // 2. Verify vehicle exists
    const vehicleResult = await client.query(
      'SELECT id, reg_number, type FROM vehicles WHERE id = $1', 
      [vehicle_id]
    );
    if (vehicleResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    const vehicle = vehicleResult.rows[0];
    
    // 3. Check for time conflicts with other assignments
    // Get all other cases this vehicle is assigned to on the same date
    if (currentFuneralDate) {
      const conflictingAssignments = await client.query(`
        SELECT 
          r.case_id,
          c.funeral_date,
          c.funeral_time,
          c.case_number,
          c.deceased_name
        FROM roster r
        JOIN cases c ON r.case_id = c.id
        WHERE r.vehicle_id = $1 
          AND r.case_id != $2
          AND r.status != 'completed'
          AND c.funeral_date = $3
      `, [vehicle_id, caseId, currentFuneralDate]);

      if (conflictingAssignments.rows.length > 0) {
        // Check if times overlap (with 2 hour buffer for service + travel)
        const BUFFER_HOURS = 2; // 2 hours buffer for service duration and travel
        
        if (currentFuneralTime) {
          const currentTime = new Date(`${currentFuneralDate}T${currentFuneralTime}`);
          const currentEndTime = new Date(currentTime.getTime() + (BUFFER_HOURS * 60 * 60 * 1000));

          for (const assignment of conflictingAssignments.rows) {
            if (assignment.funeral_time) {
              const assignmentTime = new Date(`${assignment.funeral_date}T${assignment.funeral_time}`);
              const assignmentEndTime = new Date(assignmentTime.getTime() + (BUFFER_HOURS * 60 * 60 * 1000));

              // Check if times overlap
              if (
                (currentTime >= assignmentTime && currentTime < assignmentEndTime) ||
                (currentEndTime > assignmentTime && currentEndTime <= assignmentEndTime) ||
                (currentTime <= assignmentTime && currentEndTime >= assignmentEndTime)
              ) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                  success: false, 
                  error: `Time conflict: Vehicle is already assigned to ${assignment.case_number} (${assignment.deceased_name}) at ${assignment.funeral_time || 'TBA'} on the same day. Please choose a different time or vehicle.`,
                  conflict: {
                    case_number: assignment.case_number,
                    deceased_name: assignment.deceased_name,
                    time: assignment.funeral_time
                  }
                });
              }
            } else {
              // If other assignment has no time, assume it might conflict
              await client.query('ROLLBACK');
              return res.status(400).json({ 
                success: false, 
                error: `Vehicle is assigned to ${assignment.case_number} (${assignment.deceased_name}) on the same day without a specific time. Please confirm times don't conflict or choose a different vehicle.`,
                conflict: {
                  case_number: assignment.case_number,
                  deceased_name: assignment.deceased_name
                }
              });
            }
          }
        } else {
          // Current case has no time - check if any assignment has a time
          const hasTimedAssignment = conflictingAssignments.rows.some(a => a.funeral_time);
          if (hasTimedAssignment) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
              success: false, 
              error: `Vehicle is assigned to other case(s) on the same day with specific times. Please set a funeral time for this case first, or choose a different vehicle.`,
              conflicts: conflictingAssignments.rows.map(a => ({
                case_number: a.case_number,
                deceased_name: a.deceased_name,
                time: a.funeral_time
              }))
            });
          }
        }
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
          calculatedPickupTime,
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
          calculatedPickupTime
        ]
      );
    }

    // 4. Don't mark vehicle as unavailable - allow multiple assignments if times don't conflict
    // Vehicle availability is now determined by time conflicts, not a boolean flag

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
