const { query, getClient } = require('../config/db');

// --- GET ALL CASES ---
exports.getAllCases = async (req, res) => {
    try {
        const result = await query('SELECT * FROM cases ORDER BY funeral_date DESC');
        res.json({ success: true, cases: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Failed to fetch cases' });
    }
};

// --- CREATE NEW CASE ---
exports.createCase = async (req, res) => {
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
        requires_cow, requires_tombstone, requires_catering, requires_grocery, requires_bus,
        service_type, total_price, casket_type,
        casket_colour, delivery_date, delivery_time, intake_day
    } = req.body;

    try {
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

        let finalCaseNumber = case_number;
        if (!finalCaseNumber) {
            const year = new Date().getFullYear();
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
        requires_cow, requires_tombstone, requires_catering, requires_grocery, requires_bus,
        service_type, total_price,
        casket_type, casket_colour, delivery_date, delivery_time, intake_day)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
       RETURNING *`,
            [finalCaseNumber, deceased_name, deceased_id, nok_name, nok_contact, nok_relation,
                plan_category, plan_name, plan_members, plan_age_bracket,
                funeral_date, funeral_time, venue_name, venue_address, venue_lat, venue_lng,
                requires_cow || false, requires_tombstone || false, requires_catering || false, 
                requires_grocery || false, requires_bus || false,
                service_type, total_price,
                casket_type, casket_colour, delivery_date, delivery_time, intake_day]
        );

        console.log('✅ [POST /api/cases] Case created successfully:', result.rows[0]?.id, result.rows[0]?.case_number);
        res.json({ success: true, case: result.rows[0] });
    } catch (err) {
        console.error('❌ [POST /api/cases] Error creating case:', err);
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
};

// --- ASSIGN VEHICLE TO CASE ---
exports.assignVehicle = async (req, res) => {
    const { caseId } = req.params;
    const { vehicle_id, driver_name, pickup_time } = req.body;

    if (!vehicle_id) {
        return res.status(400).json({ success: false, error: 'vehicle_id is required' });
    }

    const client = await getClient();

    try {
        await client.query('BEGIN');

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

        let calculatedPickupTime = pickup_time;

        if (deliveryDate && deliveryTime) {
            try {
                calculatedPickupTime = new Date(`${deliveryDate}T${deliveryTime}`).toISOString();
                console.log(`📅 Using delivery_time from case: ${calculatedPickupTime} (${deliveryDate} ${deliveryTime})`);
            } catch (err) {
                console.warn('⚠️  Could not parse delivery_time, falling back to calculation');
                calculatedPickupTime = null;
            }
        }

        if (!calculatedPickupTime && currentFuneralDate && currentFuneralTime) {
            try {
                const funeralDateTime = new Date(`${currentFuneralDate}T${currentFuneralTime}`);
                calculatedPickupTime = new Date(funeralDateTime.getTime() - (1.5 * 60 * 60 * 1000)).toISOString();
                console.log(`📅 Calculated pickup_time: ${calculatedPickupTime} (1.5 hours before funeral at ${currentFuneralTime})`);
            } catch (err) {
                console.warn('⚠️  Could not calculate pickup_time from funeral time, using provided or current time');
                calculatedPickupTime = pickup_time || new Date().toISOString();
            }
        } else if (!calculatedPickupTime) {
            calculatedPickupTime = pickup_time || new Date().toISOString();
        }

        const vehicleResult = await client.query(
            'SELECT id, reg_number, type FROM vehicles WHERE id = $1',
            [vehicle_id]
        );
        if (vehicleResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Vehicle not found' });
        }

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
                const BUFFER_HOURS = 2;

                if (currentFuneralTime) {
                    const currentTime = new Date(`${currentFuneralDate}T${currentFuneralTime}`);
                    const currentEndTime = new Date(currentTime.getTime() + (BUFFER_HOURS * 60 * 60 * 1000));

                    for (const assignment of conflictingAssignments.rows) {
                        if (assignment.funeral_time) {
                            const assignmentTime = new Date(`${assignment.funeral_date}T${assignment.funeral_time}`);
                            const assignmentEndTime = new Date(assignmentTime.getTime() + (BUFFER_HOURS * 60 * 60 * 1000));

                            if (
                                (currentTime >= assignmentTime && currentTime < assignmentEndTime) ||
                                (currentEndTime > assignmentTime && currentEndTime <= assignmentEndTime) ||
                                (currentTime <= assignmentTime && currentEndTime >= assignmentEndTime)
                            ) {
                                await client.query('ROLLBACK');
                                return res.status(400).json({
                                    success: false,
                                    error: `Time conflict: Vehicle is already assigned to ${assignment.case_number} (${assignment.deceased_name}) at ${assignment.funeral_time || 'TBA'} on the same day.`,
                                    conflict: {
                                        case_number: assignment.case_number,
                                        deceased_name: assignment.deceased_name,
                                        time: assignment.funeral_time
                                    }
                                });
                            }
                        } else {
                            await client.query('ROLLBACK');
                            return res.status(400).json({
                                success: false,
                                error: `Vehicle is assigned to ${assignment.case_number} (${assignment.deceased_name}) on the same day without a specific time.`,
                                conflict: {
                                    case_number: assignment.case_number,
                                    deceased_name: assignment.deceased_name
                                }
                            });
                        }
                    }
                } else {
                    const hasTimedAssignment = conflictingAssignments.rows.some(a => a.funeral_time);
                    if (hasTimedAssignment) {
                        await client.query('ROLLBACK');
                        return res.status(400).json({
                            success: false,
                            error: `Vehicle is assigned to other case(s) on the same day with specific times. Please set a funeral time for this case first.`,
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

        if (driver_name && driver_name !== 'TBD' && driver_name.trim() !== '') {
            const driverResult = await client.query(
                'SELECT id, name FROM drivers WHERE name = $1 AND active = true',
                [driver_name.trim()]
            );
            if (driverResult.rows.length === 0) {
                console.log(`⚠️  Driver "${driver_name}" not found in drivers table, but allowing assignment`);
            }
        }

        const existingRoster = await client.query(
            'SELECT id FROM roster WHERE case_id = $1',
            [caseId]
        );

        const assignedDriver = driver_name && driver_name.trim() !== ''
            ? driver_name.trim()
            : 'TBD';

        let rosterEntry;
        if (existingRoster.rows.length > 0) {
            rosterEntry = await client.query(
                `UPDATE roster 
         SET vehicle_id = $1, 
             driver_name = $2,
             pickup_time = $3,
             status = 'scheduled'
         WHERE case_id = $4
         RETURNING *`,
                [vehicle_id, assignedDriver, calculatedPickupTime, caseId]
            );
        } else {
            rosterEntry = await client.query(
                `INSERT INTO roster (case_id, vehicle_id, driver_name, pickup_time, status)
         VALUES ($1, $2, $3, $4, 'scheduled')
         RETURNING *`,
                [caseId, vehicle_id, assignedDriver, calculatedPickupTime]
            );
        }

        await client.query(
            'UPDATE vehicles SET available = false WHERE id = $1',
            [vehicle_id]
        );
        console.log(`🚗 Vehicle ${vehicle_id} marked as unavailable`);

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
};

// --- UPDATE CASE STATUS ---
exports.updateCaseStatus = async (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['intake', 'confirmed', 'preparation', 'scheduled', 'in_progress', 'completed', 'archived', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
    }

    try {
        const caseCheck = await query('SELECT id, status FROM cases WHERE id = $1', [id]);
        if (caseCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }

        const oldStatus = caseCheck.rows[0].status;

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
};

// --- UPDATE FUNERAL TIME ---
exports.updateFuneralTime = async (req, res) => {
    const { id } = req.params;
    const { funeral_time, funeral_date } = req.body;

    if (!funeral_time) {
        return res.status(400).json({
            success: false,
            error: 'funeral_time is required'
        });
    }

    try {
        const caseCheck = await query('SELECT id, status FROM cases WHERE id = $1', [id]);
        if (caseCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }

        const currentStatus = caseCheck.rows[0].status;

        if (currentStatus !== 'intake') {
            return res.status(400).json({
                success: false,
                error: `Cannot update funeral time. Case status is "${currentStatus}". Funeral time can only be changed when status is "intake".`
            });
        }

        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        if (funeral_date) {
            updateFields.push(`funeral_date = $${paramIndex++}`);
            updateValues.push(funeral_date);
        }

        updateFields.push(`funeral_time = $${paramIndex++}`);
        updateValues.push(funeral_time);

        updateFields.push(`updated_at = NOW()`);
        updateValues.push(id);

        const result = await query(
            `UPDATE cases 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
            updateValues
        );

        console.log(`✅ Case ${id} funeral time updated: ${funeral_time}`);

        res.json({
            success: true,
            message: 'Funeral time updated successfully',
            case: result.rows[0]
        });

    } catch (err) {
        console.error('❌ Error updating funeral time:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to update funeral time',
            details: err.message
        });
    }
};

// --- GET SINGLE CASE ---
exports.getCaseById = async (req, res) => {
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
};
