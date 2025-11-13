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

    res.json({ success: true, roster: data || [] });
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