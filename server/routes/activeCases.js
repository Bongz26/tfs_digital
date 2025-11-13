const express = require('express');
const router = express.Router();

// GET all active cases with roster info
router.get('/', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    // Fetch active cases
    const { data: cases, error: casesError } = await supabase
      .from('cases')
      .select(`
        id,
        case_number,
        deceased_name,
        funeral_date,
        funeral_time,
        status,
        roster!left (
          id,
          vehicle_id,
          driver_name,
          pickup_time,
          status
        )
      `)
      .in('status', ['intake', 'confirmed', 'in_progress'])
      .order('funeral_date', { ascending: true });

    if (casesError) throw casesError;

    // Format response to include vehicle/driver info
    const activeCases = cases.map(c => ({
      id: c.id,
      case_number: c.case_number,
      deceased_name: c.deceased_name,
      funeral_date: c.funeral_date,
      funeral_time: c.funeral_time,
      status: c.status,
      vehicle_assigned: c.roster && c.roster.length > 0,
      driver_assigned: c.roster && c.roster.length > 0 ? c.roster[0].driver_name : null,
      roster_id: c.roster && c.roster.length > 0 ? c.roster[0].id : null
    }));

    res.json({ success: true, activeCases });

  } catch (err) {
    console.error('ActiveCases fetch error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
