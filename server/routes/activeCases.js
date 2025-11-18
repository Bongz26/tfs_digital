// server/routes/activeCases.js
const express = require('express');
const router = express.Router();

// GET /api/activeCases - SIMPLIFIED AND FIXED
router.get('/', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    console.log('Fetching active cases...');

    // Get active cases (simplified query)
    const { data: cases, error: casesError } = await supabase
      .from('cases')
      .select('*')
      .in('status', ['intake', 'confirmed', 'in_progress'])
      .order('funeral_date', { ascending: true });

    if (casesError) {
      console.error('Active cases query error:', casesError);
      throw casesError;
    }

    console.log(`Found ${cases?.length || 0} active cases`);

    // Get available vehicles
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('available', true)
      .order('type', { ascending: true });

    if (vehiclesError) {
      console.error('Vehicles query error:', vehiclesError);
      throw vehiclesError;
    }

    console.log(`Found ${vehicles?.length || 0} available vehicles`);

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

    // Attach roster data to cases
    const casesWithRoster = cases.map(caseItem => ({
      ...caseItem,
      roster: rosterAssignments[caseItem.id] || []
    }));

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