// server/routes/dashboard.js
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { supabase } = req.app.locals;

    // 1. Upcoming funerals
    const { count: upcoming } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed')
      .gte('funeral_date', new Date().toISOString().split('T')[0]);

    // 2. Vehicles needed
    const { data: roster } = await supabase
      .from('roster')
      .select('vehicle_id')
      .eq('status', 'scheduled');
    const vehiclesNeeded = roster ? roster.length : 0;

    // 3. Available vehicles
    const { count: available } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('available', true);

    // 4. Low stock
    const { data: lowStock } = await supabase
      .from('inventory')
      .select('name')
      .lt('stock_quantity', supabase.raw('low_stock_threshold'));

    // 5. Cows assigned
    const { count: cowsAssigned } = await supabase
      .from('livestock')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'assigned');

    res.json({
      upcoming: upcoming || 0,
      vehiclesNeeded,
      vehiclesAvailable: available || 0,
      conflicts: vehiclesNeeded > (available || 0),
      lowStock: lowStock ? lowStock.map(i => i.name) : [],
      cowsAssigned: cowsAssigned || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;