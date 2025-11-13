// server/routes/activeCases.js
const express = require('express');
const router = express.Router();

// GET /api/activeCases
router.get('/', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    const { data, error } = await supabase
      .from('cases')
      .select(`id, case_number, deceased_name, funeral_date, status, 
               roster:roster(id, vehicle_id, driver_name, pickup_time),
               vehicles:vehicles(*)`)
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
