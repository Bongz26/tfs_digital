const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const today = new Date().toISOString().split('T')[0];

    // 1. Upcoming Funerals (from today)
    const { count: funeralsCount, error: casesError } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .gte('funeral_date', today);

    if (casesError) throw casesError;

    // 2. Vehicles Available (use boolean field)
    const { count: vehiclesAvailable, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('available', true);  // ✅ Use boolean field

    if (vehiclesError) throw vehiclesError;

    // 3. Low Stock Items
    const { data: lowStock, error: inventoryError } = await supabase
      .from('inventory')
      .select('*')
      .lte('stock_quantity', 5);

    if (inventoryError) throw inventoryError;

    // 4. Cows Assigned
    const { count: cowsAssigned, error: cowError } = await supabase
      .from('livestock')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'assigned');

    if (cowError) throw cowError;

    // 5. RECENT CASES (last 5 created) - ✅ ADD THIS BACK
    const { data: recentCases, error: recentError } = await supabase
      .from('cases')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) throw recentError;

    // ✅ Response WITH recent cases
    res.json({
      upcoming: funeralsCount || 0,
      vehiclesNeeded: funeralsCount || 0,
      vehiclesAvailable: vehiclesAvailable || 0,
      conflicts: (vehiclesAvailable || 0) < (funeralsCount || 0),
      lowStock: Array.isArray(lowStock) ? lowStock : [],
      cowsAssigned: cowsAssigned || 0,
      recentCases: recentCases || []  // ✅ This fixes your dashboard
    });

  } catch (error) {
    console.error('Dashboard route error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      upcoming: 0,
      vehiclesNeeded: 0,
      vehiclesAvailable: 0,
      conflicts: false,
      lowStock: [],
      cowsAssigned: 0,
      recentCases: []  // ✅ Return empty array on error
    });
  }
});