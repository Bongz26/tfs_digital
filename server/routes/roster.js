// server/routes/roster.js
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { supabase } = req.app.locals;
    const { data } = await supabase
      .from('roster')
      .select(`
        vehicles!inner(reg_number, driver_name, type),
        cases!inner(case_number, plan_name, funeral_time, venue_name)
      `)
      .eq('status', 'scheduled');

    const formatted = data.map(r => ({
      reg_number: r.vehicles.reg_number,
      driver_name: r.vehicles.driver_name,
      type: r.vehicles.type,
      case_number: r.cases.case_number,
      plan_name: r.cases.plan_name,
      funeral_time: r.cases.funeral_time,
      venue_name: r.cases.venue_name
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;