// server/routes/activeCases.js
const express = require('express');
const router = express.Router();

// GET /api/activeCases - SIMPLIFIED AND FIXED
router.get('/', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    console.log('Fetching active cases...');

    // Get active cases (exclude completed and archived)
    const { data: cases, error: casesError } = await supabase
      .from('cases')
      .select('*')
      .not('status', 'eq', 'completed')
      .not('status', 'eq', 'archived')
      .order('funeral_date', { ascending: true });

    if (casesError) {
      console.error('Active cases query error:', casesError);
      throw casesError;
    }

    console.log(`Found ${cases?.length || 0} active cases`);

    // Get all vehicles (availability is now based on time conflicts, not a boolean)
    const { data: allVehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*')
      .order('type', { ascending: true });

    if (vehiclesError) {
      console.error('Vehicles query error:', vehiclesError);
      throw vehiclesError;
    }

    console.log(`Found ${allVehicles?.length || 0} total vehicles`);

    // Get all roster assignments with case details for conflict checking
    const { data: allRosterAssignments, error: rosterAssignmentsError } = await supabase
      .from('roster')
      .select(`
        vehicle_id,
        case_id,
        status,
        cases:case_id (
          funeral_date,
          funeral_time,
          case_number,
          deceased_name
        )
      `)
      .neq('status', 'completed');

    // Flatten roster assignments with case details
    const allVehicleAssignments = (allRosterAssignments || []).map(r => ({
      vehicle_id: r.vehicle_id,
      case_id: r.case_id,
      status: r.status,
      funeral_date: r.cases?.funeral_date || null,
      funeral_time: r.cases?.funeral_time || null,
      case_number: r.cases?.case_number || null,
      deceased_name: r.cases?.deceased_name || null
    }));

    const vehicles = allVehicles || [];

    // Get roster assignments for these cases
    const caseIds = cases.map(c => c.id);
    let rosterAssignments = [];
    
    if (caseIds.length > 0) {
      const { data: rosterData, error: rosterError } = await supabase
        .from('roster')
        .select('case_id, vehicle_id, driver_name, status')
        .in('case_id', caseIds);
      
      if (!rosterError && rosterData) {
        // Group by case_id
        const rosterByCase = {};
        rosterData.forEach(r => {
          if (!rosterByCase[r.case_id]) {
            rosterByCase[r.case_id] = [];
          }
          rosterByCase[r.case_id].push(r);
        });
        rosterAssignments = rosterByCase;
      }
    }

    // Attach roster data to cases and calculate available vehicles per case
    const casesWithRoster = cases.map(caseItem => {
      // Get vehicles available for this specific case (no time conflicts)
      const availableForCase = vehicles.filter(vehicle => {
        // Get assignments for this vehicle
        const vehicleAssignments = allVehicleAssignments.filter(a => a.vehicle_id === vehicle.id);
        
        // Check for conflicts
        if (!caseItem.funeral_date) {
          return true; // No date = can't check conflicts, allow all
        }

        // Check same-day assignments
        const sameDayAssignments = vehicleAssignments.filter(a => 
          a.funeral_date === caseItem.funeral_date && 
          a.case_id !== caseItem.id &&
          a.status !== 'completed'
        );

        if (sameDayAssignments.length === 0) {
          return true; // No same-day assignments
        }

        if (!caseItem.funeral_time) {
          // Case has no time - check if any assignment has a time
          const hasTimedAssignment = sameDayAssignments.some(a => a.funeral_time);
          return !hasTimedAssignment; // Available only if no timed assignments
        }

        // Check time overlap (2 hour buffer)
        const BUFFER_HOURS = 2;
        const currentTime = new Date(`${caseItem.funeral_date}T${caseItem.funeral_time}`);
        const currentEndTime = new Date(currentTime.getTime() + (BUFFER_HOURS * 60 * 60 * 1000));

        for (const assignment of sameDayAssignments) {
          if (!assignment.funeral_time) {
            return false; // Assignment has no time, assume conflict
          }

          const assignmentTime = new Date(`${assignment.funeral_date}T${assignment.funeral_time}`);
          const assignmentEndTime = new Date(assignmentTime.getTime() + (BUFFER_HOURS * 60 * 60 * 1000));

          // Check if times overlap
          if (
            (currentTime >= assignmentTime && currentTime < assignmentEndTime) ||
            (currentEndTime > assignmentTime && currentEndTime <= assignmentEndTime) ||
            (currentTime <= assignmentTime && currentEndTime >= assignmentEndTime)
          ) {
            return false; // Conflict found
          }
        }

        return true; // No conflicts
      });

      return {
        ...caseItem,
        roster: rosterAssignments[caseItem.id] || [],
        available_vehicles: availableForCase // Vehicles available for this specific case
      };
    });

    res.json({ 
      success: true, 
      cases: casesWithRoster || [],
      vehicles: vehicles || [] 
    });

  } catch (err) {
    console.error('ActiveCases route error:', err.message);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      cases: [],
      vehicles: []
    });
  }
});

module.exports = router;