// server/routes/activeCases.js
const express = require('express');
const router = express.Router();

// GET /api/activeCases - FIXED VERSION
router.get('/', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    const { data, error } = await supabase
      .from('cases')
      .select(`
        id, case_number, deceased_name, funeral_date, funeral_time, status,
        venue_name, venue_address,
        roster:roster(id, vehicle_id, driver_name, pickup_time, status),
        vehicles:vehicles(id, reg_number, type, driver_name)
      `)
      .in('status', ['intake', 'confirmed', 'in_progress'])
      .order('funeral_date', { ascending: true });

    if (error) throw error;

    res.json({ success: true, cases: data });
  } catch (err) {
    console.error('ActiveCases fetch error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;