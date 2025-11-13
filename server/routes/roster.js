// server/routes/roster.js
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    // ✅ Only include cases where a driver is assigned
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .not('driver_assigned', 'is', null)
      .order('funeral_date', { ascending: true });

    if (error) throw error;

    res.json({ roster: data || [] });
  } catch (err) {
    console.error('❌ Roster route error:', err);
    res.status(500).json({ roster: [] });
  }
});

module.exports = router;
