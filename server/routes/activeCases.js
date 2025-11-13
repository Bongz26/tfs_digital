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

    // For now, just return cases without roster data
    const casesWithRoster = cases.map(caseItem => ({
      ...caseItem,
      roster: [] // Empty array for now to avoid complex joins
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