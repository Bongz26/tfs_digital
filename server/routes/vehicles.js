// server/routes/vehicles.js
const express = require('express');
const router = express.Router();
const { requireAuth, requireMinRole, ROLES } = require('../middleware/auth');

// GET /api/vehicles/available
router.get('/available', requireAuth, requireMinRole(ROLES.STAFF), async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('available', true)
      .order('type', { ascending: true });

    if (error) throw error;

    res.json({ success: true, vehicles: data });
  } catch (err) {
    console.error('Vehicles fetch error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
