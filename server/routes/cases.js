// server/routes/cases.js
const express = require('express');
const router = express.Router();

// POST /api/cases/assign/:case_id
router.post('/assign/:case_id', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const case_id = req.params.case_id;
    const { vehicle_id, driver_name, pickup_time } = req.body;

    if (!vehicle_id || !driver_name || !pickup_time) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Insert into roster
    const { data, error } = await supabase
      .from('roster')
      .insert([{ case_id, vehicle_id, driver_name, pickup_time }])
      .select('*')
      .single();

    if (error) throw error;

    // Mark vehicle as unavailable
    const { error: vehicleError } = await supabase
      .from('vehicles')
      .update({ available: false })
      .eq('id', vehicle_id);

    if (vehicleError) console.warn('Vehicle update warning:', vehicleError.message);

    res.json({ success: true, roster: data });

  } catch (err) {
    console.error('Assign vehicle error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
