// server/routes/roster.js
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { supabase } = req.app.locals;
    const { data, error } = await supabase
      .from('roster')
      .select(`
        id,
        case_id,
        vehicle_id,
        driver_name,
        pickup_time,
        status,
        vehicles!inner(reg_number, driver_name, type),
        cases!inner(id, case_number, plan_name, funeral_time, venue_name, funeral_date)
      `)
      .eq('status', 'scheduled')
      .order('pickup_time', { ascending: true });

    if (error) {
      console.error('Roster fetch error:', error);
      throw error;
    }

    const formatted = (data || []).map(r => ({
      id: r.id,
      case_id: r.case_id || r.cases?.id,
      vehicle_id: r.vehicle_id,
      reg_number: r.vehicles?.reg_number || null,
      driver_name: r.driver_name || r.vehicles?.driver_name || null,
      vehicle_type: r.vehicles?.type || null,
      case_number: r.cases?.case_number || null,
      plan_name: r.cases?.plan_name || null,
      funeral_time: r.cases?.funeral_time || null,
      funeral_date: r.cases?.funeral_date || null,
      venue_name: r.cases?.venue_name || null,
      pickup_time: r.pickup_time,
      status: r.status
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Roster error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;