// server/routes/vehicles.js
const express = require('express');
const router = express.Router();

// GET all vehicles
router.get('/', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('type')
      .order('reg_number');
    if (error) throw error;
    res.json({ success: true, vehicles: data });
  } catch (err) {
    console.error('Vehicles fetch error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET only available vehicles
router.get('/available', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('available', true)
      .order('type')
      .order('reg_number');
    if (error) throw error;
    res.json({ success: true, vehicles: data });
  } catch (err) {
    console.error('Available vehicles fetch error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
