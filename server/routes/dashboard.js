// server/routes/dashboard.js
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    // Safely query your Supabase tables
    const { count: funeralsCount, error: funeralsError } = await supabase
      .from('funerals')
      .select('*', { count: 'exact', head: true });

    const { count: vehiclesCount, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true });

    const { data: lowStock, error: lowStockError } = await supabase
      .from('inventory')
      .select('*')
      .lte('quantity', 5);

    // If any query failed, throw so we handle it below
    if (funeralsError || vehiclesError || lowStockError) {
      throw new Error(funeralsError?.message || vehiclesError?.message || lowStockError?.message);
    }

    const cowsAssigned = 3; // static example

    // Always send a predictable, complete JSON response
    res.json({
      upcoming: funeralsCount || 0,
      vehiclesNeeded: funeralsCount || 0,
      vehiclesAvailable: vehiclesCount || 0,
      conflicts: (vehiclesCount || 0) < (funeralsCount || 0),
      lowStock: Array.isArray(lowStock) ? lowStock : [], // ✅ Always an array
      cowsAssigned
    });

  } catch (error) {
    console.error('Dashboard route error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      upcoming: 0,
      vehiclesNeeded: 0,
      vehiclesAvailable: 0,
      conflicts: false,
      lowStock: [], // ✅ Make sure frontend never breaks
      cowsAssigned: 0
    });
  }
});

module.exports = router;
