// server/routes/vehicles.js
const express = require('express');
const router = express.Router();

// GET /api/vehicles
router.get('/', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    if (supabase) {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('type', { ascending: true });
      if (error) throw error;
      return res.json({ success: true, vehicles: data });
    }
    const { query } = require('../config/db');
    const result = await query('SELECT * FROM vehicles ORDER BY type ASC');
    res.json({ success: true, vehicles: result.rows || [] });
  } catch (err) {
    console.error('Vehicles fetch error:', err.message);
    res.status(500).json({ success: false, error: err.message, vehicles: [] });
  }
});

// GET /api/vehicles/available
router.get('/available', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    if (supabase) {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('available', true)
        .order('type', { ascending: true });
      if (error) throw error;
      return res.json({ success: true, vehicles: data });
    }
    const { query } = require('../config/db');
    const result = await query('SELECT * FROM vehicles WHERE available = true ORDER BY type ASC');
    res.json({ success: true, vehicles: result.rows || [] });
  } catch (err) {
    console.error('Vehicles fetch error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
