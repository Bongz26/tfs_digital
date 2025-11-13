// server/routes/roster.js
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  const supabase = req.app.locals.supabase;

  try {
    const { data, error } = await supabase
      .from('roster')
      .select(`
        id,
        date,
        time,
        case_id,
        vehicle_id,
        driver,
        destination,
        cases:case_id (
          case_number,
          deceased_name,
          funeral_date,
          funeral_time
        ),
        vehicles:vehicle_id (
          id,
          plate_number,
          registration,
          model,
          available
        )
      `)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) throw error;

    // ✅ Normalize vehicle data so we don’t depend on a single column name
    const cleaned = (data || []).map(item => ({
      ...item,
      vehicle: item.vehicles ? {
        ...item.vehicles,
        display_name: item.vehicles.registration || item.vehicles.plate_number || item.vehicles.model || 'Unknown'
      } : null
    }));

    res.json({ success: true, roster: cleaned });
  } catch (err) {
    console.error('❌ /api/roster route error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
