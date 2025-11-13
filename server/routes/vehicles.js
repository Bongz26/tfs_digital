const express = require('express');
const router = express.Router();

// GET /api/vehicles/available - FIXED VERSION
router.get('/available', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    // Use the boolean 'available' field since you have actual data in it
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('available', true)  // ✅ Use the boolean field that has your data
      .order('type', { ascending: true });

    if (error) throw error;

    res.json({ success: true, vehicles: data });
  } catch (err) {
    console.error('Vehicles fetch error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});