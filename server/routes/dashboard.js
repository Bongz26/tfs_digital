// server/routes/dashboard.js
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const today = new Date().toISOString().split('T')[0];

    // --- 1️⃣ Upcoming Funerals
    const { count: funeralsCount, error: casesError } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .gte('funeral_date', today);

    if (casesError) {
      console.error('❌ casesError:', casesError);
      throw casesError;
    }

    // --- 2️⃣ Vehicles Available
    const { count: vehiclesAvailable, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('available', true);

    if (vehiclesError) {
      console.error('❌ vehiclesError:', vehiclesError);
      throw vehiclesError;
    }

    // --- 3️⃣ Low Stock Items
    const { data: lowStock, error: inventoryError } = await supabase
      .from('inventory')
      .select('*')
      .lte('stock_quantity', 5);

    if (inventoryError) {
      console.error('❌ inventoryError:', inventoryError);
      throw inventoryError;
    }

    // --- 4️⃣ Cows Assigned
    const { count: cowsAssigned, error: cowError } = await supabase
      .from('livestock')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'assigned');

    if (cowError) {
      console.error('❌ cowError:', cowError);
      throw cowError;
    }

    // --- ✅ Response
    res.json({
      upcoming: funeralsCount || 0,
      vehiclesNeeded: funeralsCount || 0,
      vehiclesAvailable: vehiclesAvailable || 0,
      conflicts: (vehiclesAvailable || 0) < (funeralsCount || 0),
      lowStock: Array.isArray(lowStock) ? lowStock : [],
      cowsAssigned: cowsAssigned || 0
    });

  } catch (error) {
    console.error('❌ Dashboard route error (main catch):', error);
    res.status(500).json({
      error: 'Internal Server Error',
      upcoming: 0,
      vehiclesNeeded: 0,
      vehiclesAvailable: 0,
      conflicts: false,
      lowStock: [],
      cowsAssigned: 0
    });
  }
});

module.exports = router;
