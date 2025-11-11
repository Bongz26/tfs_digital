// server/routes/dashboard.js
const express = require('express');
const router = express.Router();

// Example route to send dashboard stats
router.get('/', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    // Example queries — you can adjust names to your tables
    const { count: funeralsCount } = await supabase
      .from('funerals')
      .select('*', { count: 'exact', head: true });

    const { count: vehiclesCount } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true });

    const { data: lowStock } = await supabase
      .from('inventory')
      .select('*')
      .lte('quantity', 5); // Example: low stock items

    const cowsAssigned = 3; // Example static number for now

    // Build your frontend-friendly stats object
    res.json({
      upcoming: funeralsCount || 0,
      vehiclesNeeded: funeralsCount || 0,
      vehiclesAvailable: vehiclesCount || 0,
      conflicts: (vehiclesCount || 0) < (funeralsCount || 0),
      lowStock: lowStock || [],
      cowsAssigned
    });

  } catch (error) {
    console.error('Dashboard route error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
