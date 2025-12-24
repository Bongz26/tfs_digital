// server/routes/vehicles.js
const express = require('express');
const router = express.Router();

// GET /api/vehicles
router.get('/', async (req, res) => {
  try {
    let vehicles = [];
    let source = 'none';

    // 1. Try Supabase
    const supabase = req.app.locals.supabase;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .order('type', { ascending: true });

        if (!error && data && data.length > 0) {
          vehicles = data;
          source = 'supabase';
        } else if (error) {
          console.warn('Supabase vehicles fetch error:', error.message);
        }
      } catch (err) {
        console.warn('Supabase fetch failed:', err.message);
      }
    }

    // 2. Fallback to Local DB if empty
    if (vehicles.length === 0) {
      try {
        const { query } = require('../config/db');
        const result = await query('SELECT * FROM vehicles ORDER BY type ASC');
        if (result.rows && result.rows.length > 0) {
          vehicles = result.rows;
          source = 'local_db';
        }
      } catch (err) {
        console.warn('Local DB fetch failed:', err.message);
      }
    }

    console.log(`Fetched ${vehicles.length} vehicles from ${source}`);
    res.json({ success: true, vehicles, source });

  } catch (err) {
    console.error('Vehicles fetch error:', err.message);
    res.status(500).json({ success: false, error: err.message, vehicles: [] });
  }
});

// GET /api/vehicles/available
router.get('/available', async (req, res) => {
  try {
    let vehicles = [];
    let source = 'none';

    // 1. Try Supabase
    const supabase = req.app.locals.supabase;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .eq('available', true)
          .order('type', { ascending: true });

        if (!error && data && data.length > 0) {
          vehicles = data;
          source = 'supabase';
        }
      } catch (e) { console.warn(e); }
    }

    // 2. Fallback to Local DB
    if (vehicles.length === 0) {
      try {
        const { query } = require('../config/db');
        const result = await query('SELECT * FROM vehicles WHERE available = true ORDER BY type ASC');
        if (result.rows && result.rows.length > 0) {
          vehicles = result.rows;
          source = 'local_db';
        }
      } catch (e) { console.warn(e); }
    }

    res.json({ success: true, vehicles, source });
  } catch (err) {
    console.error('Vehicles fetch error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
