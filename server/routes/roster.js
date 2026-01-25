// server/routes/roster.js
const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    const { data, error } = await supabase
      .from('roster')
      .select(`
        id,
        case_id,
        vehicle_id,
        driver_name,
        pickup_time,
        status,
        assignment_role,
        external_vehicle,
        cases:case_id (
          case_number,
          deceased_name,
          funeral_date,
          funeral_time,
          delivery_date,
          delivery_time,
          venue_name,
          burial_place,
          status
        ),
        vehicles:vehicle_id (
          id,
          reg_number,
          type
        )
      `)
      .order('pickup_time', { ascending: true });

    if (error) {
      console.error('Roster query error:', error);
      throw error;
    }

    // Flatten the nested structure for easier frontend access
    const flattenedRoster = (data || []).map(item => {
      const caseData = Array.isArray(item.cases) ? item.cases[0] : item.cases;
      const vehicleData = Array.isArray(item.vehicles) ? item.vehicles[0] : item.vehicles;

      return {
        id: item.id,
        case_id: item.case_id,
        vehicle_id: item.vehicle_id,
        driver_name: item.driver_name || null,
        pickup_time: item.pickup_time,
        status: item.status,
        assignment_role: item.assignment_role || null,
        external_vehicle: item.external_vehicle || null,
        // Case data (flattened)
        case_number: caseData?.case_number || null,
        deceased_name: caseData?.deceased_name || null,
        funeral_date: caseData?.funeral_date || null,
        funeral_time: caseData?.funeral_time || null,
        delivery_date: caseData?.delivery_date || null,
        delivery_time: caseData?.delivery_time || null,
        venue_name: caseData?.venue_name || null,
        burial_place: caseData?.burial_place || null,
        case_status: caseData?.status || null,
        // Vehicle data (flattened)
        reg_number: item.external_vehicle ? item.external_vehicle : (vehicleData?.reg_number || null),
        vehicle_type: item.external_vehicle ? 'Hired / External' : (vehicleData?.type || null)
      };
    });

    console.log(`✅ Roster: Returning ${flattenedRoster.length} items`);
    if (flattenedRoster.length > 0) {
      console.log('📋 Sample roster item:', JSON.stringify(flattenedRoster[0], null, 2));
    }

    res.json({ success: true, roster: flattenedRoster });
  } catch (err) {
    console.error('Roster route error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message,
      roster: []
    });
  }
});

// PATCH /api/roster/:id - update driver or status
router.patch('/:id', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const id = parseInt(req.params.id, 10);
    const { driver_name, status, pickup_time, assignment_role, vehicle_id } = req.body || {};

    const updates = {};
    if (driver_name != null) updates.driver_name = String(driver_name);
    if (status != null) updates.status = String(status);
    if (pickup_time != null) updates.pickup_time = String(pickup_time);
    if (assignment_role != null) updates.assignment_role = String(assignment_role);
    if (vehicle_id != null) updates.vehicle_id = parseInt(vehicle_id, 10);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    // ================== ADMIN-ONLY OVERRIDE CHECK ==================
    // Check if updating driver or vehicle and if case is already submitted/scheduled
    const isAdmin = req.user && String(req.user.role).toLowerCase() === 'admin';

    if (driver_name != null || vehicle_id != null) {
      // Get the case associated with this roster entry
      let caseStatus = null;
      let caseName = null;

      console.log(`🔍 Checking constraints for roster update: id=${id}`);

      if (supabase) {
        console.log('   Using Supabase client for check...');
        const { data: rosterData, error: rosterErr } = await supabase
          .from('roster')
          .select('case_id, cases:case_id (status, deceased_name, case_number)')
          .eq('id', id)
          .limit(1);

        if (rosterErr) {
          console.error('   Error fetching roster/case via Supabase:', rosterErr);
          throw rosterErr;
        }
        const rosterEntry = Array.isArray(rosterData) ? rosterData[0] : rosterData;
        console.log('   Roster Entry found:', rosterEntry ? 'YES' : 'NO');

        if (rosterEntry && rosterEntry.cases) {
          caseStatus = rosterEntry.cases.status;
          caseName = rosterEntry.cases.deceased_name || rosterEntry.cases.case_number;
          console.log(`   Case found: ${caseName}, Status: ${caseStatus}`);
        } else {
          console.warn('   ⚠️ Roster entry found but NO case data linked!');
        }
      } else {
        // PostgreSQL path
        console.log('   Using standard DB query for check...');
        const caseRes = await query(
          `SELECT c.status, c.deceased_name, c.case_number 
           FROM cases c 
           JOIN roster r ON r.case_id = c.id 
           WHERE r.id = $1`,
          [id]
        );
        if (caseRes.rows.length > 0) {
          caseStatus = caseRes.rows[0].status;
          caseName = caseRes.rows[0].deceased_name || caseRes.rows[0].case_number;
          console.log(`   Case found: ${caseName}, Status: ${caseStatus}`);
        } else {
          console.warn('   ⚠️ No case found matching roster id:', id);
        }
      }

      // Locked statuses that require admin override
      const lockedStatuses = ['scheduled', 'in_progress', 'completed'];
      const isLocked = caseStatus && lockedStatuses.includes(String(caseStatus).toLowerCase());
      console.log(`   Is Locked? ${isLocked} (Status: ${caseStatus})`);
      console.log(`   Is Admin? ${isAdmin} (Role: ${req.user ? req.user.role : 'none'})`);

      if (isLocked) {
        if (!isAdmin) {
          console.warn(`⚠️ BLOCKED: Non-admin user attempted to modify ${driver_name != null ? 'driver' : 'vehicle'} for case ${caseName}`);
          return res.status(403).json({
            success: false,
            error: `This case (${caseName}) has been submitted and scheduled. Only administrators can modify driver or vehicle assignments after submission.`,
            case_status: caseStatus,
            requires_admin: true
          });
        } else {
          console.log(`⚠️ ADMIN OVERRIDE: Admin is modifying ${driver_name != null ? 'driver' : 'vehicle'} for case ${caseName}`);
        }
      } else {
        console.log('   ✅ Modification allowed (Case not locked)');
      }
    }
    // ================== END ADMIN-ONLY OVERRIDE CHECK ==================

    // If changing vehicle, perform conflict checks
    if (vehicle_id != null) {
      const isAdmin = req.user && String(req.user.role).toLowerCase() === 'admin';
      const BUFFER_HOURS = 2;
      if (supabase) {
        const { data: currentRoster, error: rosterErr } = await supabase
          .from('roster')
          .select('id, case_id, status')
          .eq('id', id)
          .limit(1);
        if (rosterErr) throw rosterErr;
        const current = Array.isArray(currentRoster) ? currentRoster[0] : currentRoster;
        if (!current) return res.status(404).json({ success: false, error: 'Roster entry not found' });

        const { data: caseRow, error: caseErr } = await supabase
          .from('cases')
          .select('id, funeral_date, funeral_time')
          .eq('id', current.case_id)
          .limit(1);
        if (caseErr) throw caseErr;
        const c = Array.isArray(caseRow) ? caseRow[0] : caseRow;
        if (!c) return res.status(404).json({ success: false, error: 'Case not found for roster entry' });

        if (c.funeral_date) {
          const { data: sameDayAssignments, error: confErr } = await supabase
            .from('roster')
            .select(`id, case_id, status, cases:case_id (funeral_date, funeral_time, case_number, deceased_name)`)
            .neq('status', 'completed')
            .eq('vehicle_id', vehicle_id)
            .neq('case_id', current.case_id);
          if (confErr) throw confErr;
          const conflicts = (sameDayAssignments || []).filter(a => a.cases?.funeral_date === c.funeral_date);
          if (conflicts.length) {
            if (!c.funeral_time) {
              if (!isAdmin) {
                return res.status(400).json({ success: false, error: 'Cannot assign vehicle: case has no funeral time and vehicle has same-day assignments' });
              }
            }
            const currentStart = new Date(`${c.funeral_date}T${c.funeral_time}`);
            const BUFFER_HOURS = 1.5;
            const currentEnd = new Date(currentStart.getTime() + BUFFER_HOURS * 3600 * 1000);
            for (const a of conflicts) {
              const ft = a.cases?.funeral_time;
              if (!ft) {
                if (!isAdmin) {
                  return res.status(400).json({ success: false, error: `Time conflict: vehicle assigned to ${a.cases?.case_number || 'another case'} without specific time` });
                }
              }
              const aStart = new Date(`${a.cases.funeral_date}T${ft}`);
              const aEnd = new Date(aStart.getTime() + BUFFER_HOURS * 3600 * 1000);
              if (currentStart < aEnd && currentEnd > aStart) {
                if (!isAdmin) {
                  return res.status(400).json({ success: false, error: `Time conflict with ${a.cases?.case_number || 'another case'} at ${ft}` });
                }
              }
            }
          }
        }
      } else {
        // DB path
        const currentRes = await query('SELECT id, case_id, status FROM roster WHERE id = $1', [id]);
        if (currentRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Roster entry not found' });
        const current = currentRes.rows[0];
        const caseRes = await query('SELECT id, funeral_date, funeral_time FROM cases WHERE id = $1', [current.case_id]);
        if (caseRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Case not found for roster entry' });
        const c = caseRes.rows[0];
        if (c.funeral_date) {
          const confRes = await query(
            `SELECT r.case_id, c.funeral_date, c.funeral_time, c.case_number, c.deceased_name
             FROM roster r JOIN cases c ON r.case_id = c.id
             WHERE r.vehicle_id = $1 AND r.case_id != $2 AND r.status != 'completed' AND c.funeral_date = $3`,
            [vehicle_id, current.case_id, c.funeral_date]
          );
          const conflicts = confRes.rows;
          const isAdmin = req.user && String(req.user.role).toLowerCase() === 'admin';
          if (conflicts.length) {
            if (!c.funeral_time) {
              if (!isAdmin) {
                return res.status(400).json({ success: false, error: 'Cannot assign vehicle: case has no funeral time and vehicle has same-day assignments' });
              }
            }
            const start = new Date(`${c.funeral_date}T${c.funeral_time}`);
            const BUFFER_HOURS = 1.5;
            const end = new Date(start.getTime() + BUFFER_HOURS * 3600 * 1000);
            for (const a of conflicts) {
              if (!a.funeral_time) {
                if (!isAdmin) {
                  return res.status(400).json({ success: false, error: `Time conflict: vehicle assigned to ${a.case_number} without specific time` });
                }
              }
              const aStart = new Date(`${a.funeral_date}T${a.funeral_time}`);
              const aEnd = new Date(aStart.getTime() + BUFFER_HOURS * 3600 * 1000);
              if (start < aEnd && end > aStart) {
                if (!isAdmin) {
                  return res.status(400).json({ success: false, error: `Time conflict with ${a.case_number} at ${a.funeral_time}` });
                }
              }
            }
          }
        }
      }
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('roster')
        .update(updates)
        .eq('id', id)
        .select('*')
        .limit(1);
      if (error) throw error;
      return res.json({ success: true, roster: Array.isArray(data) ? data[0] : data });
    }

    const fields = [];
    const values = [];
    let idx = 1;
    for (const [k, v] of Object.entries(updates)) {
      fields.push(`${k} = $${idx++}`);
      values.push(v);
    }
    values.push(id);
    const sql = `UPDATE roster SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await query(sql, values);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Roster entry not found' });
    res.json({ success: true, roster: result.rows[0] });
  } catch (err) {
    console.error('Roster update error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/roster/:id - remove roster assignment
router.delete('/:id', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const id = parseInt(req.params.id, 10);

    // Only allow admins or dispatchers to delete?
    // For now, allow logged in users as per app logic (auth middleware handles basic login)
    // Ideally check if user has permission, but let's stick to consistent pattern.

    if (supabase) {
      const { error } = await supabase
        .from('roster')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return res.json({ success: true, message: 'Assignment removed' });
    }

    // DB path
    const { query } = require('../config/db');
    const result = await query('DELETE FROM roster WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Roster entry not found' });
    }

    res.json({ success: true, message: 'Assignment removed' });
  } catch (err) {
    console.error('Roster delete error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
