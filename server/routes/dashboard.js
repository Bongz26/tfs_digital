// server/routes/dashboard.js
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { supabase } = req.app.locals;

    const { count: upcoming } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .in('status', ['confirmed', 'in_progress']);

    const { data: roster } = await supabase.from('roster').select('vehicle_id');
    const vehiclesNeeded = roster ? roster.length : 0;

    const { count: available } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('available', true);

    const { data: lowStock } = await supabase
      .from('inventory')
      .select('name')
      .lt('stock_quantity', supabase.raw('low_stock_threshold'));

    const { count: cows } = await supabase
      .from('livestock')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'assigned');

    res.json({
      upcoming: upcoming || 0,
      vehiclesNeeded,
      vehiclesAvailable: available || 0,
      conflicts: vehiclesNeeded > (available || 0),
      lowStock: lowStock ? lowStock.map(i => i.name) : [],
      cowsAssigned: cows || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;