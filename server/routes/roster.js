// server/routes/roster.js
const express = require('express');
const router = express.Router();

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
        cases:case_id (
          case_number,
          deceased_name,
          funeral_date,
          funeral_time,
          venue_name
        ),
        vehicles:vehicle_id (
          id,
          reg_number,
          type,
          driver_name
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
        driver_name: item.driver_name || vehicleData?.driver_name || null,
        pickup_time: item.pickup_time,
        status: item.status,
        // Case data (flattened)
        case_number: caseData?.case_number || null,
        deceased_name: caseData?.deceased_name || null,
        funeral_date: caseData?.funeral_date || null,
        funeral_time: caseData?.funeral_time || null,
        venue_name: caseData?.venue_name || null,
        // Vehicle data (flattened)
        reg_number: vehicleData?.reg_number || null,
        vehicle_type: vehicleData?.type || null,
        vehicle_driver_name: vehicleData?.driver_name || null
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

module.exports = router;