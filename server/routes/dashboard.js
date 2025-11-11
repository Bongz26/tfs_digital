// server/routes/dashboard.js
const express = require('express');
const router = express.Router();

/**
 * THUSANANG FUNERAL SERVICES - DASHBOARD ROUTE
 * Shows live overview: funerals, vehicles, inventory, cows, etc.
 */
router.get('/', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    /** ------------------------------------------------------
     * 1️⃣  UPCOMING FUNERALS (cases with funeral_date >= today)
     * ------------------------------------------------------ */
    const today = new Date().toISOString().split('T')[0];
    const { count: funeralsCount, error: casesError } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .gte('funeral_date', today);

    if (casesError) throw casesError;

    /** ------------------------------------
     * 2️⃣  VEHICLES - Total available count
     * ------------------------------------ */
    const { count: vehiclesAvailable, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('available', true);

    if (vehiclesError) throw vehiclesError;

    /** -----------------------------------------
     * 3️⃣  LOW STOCK ITEMS (stock ≤ threshold)
     * ----------------------------------------- */
    const { data: lowStock, error: inventoryError } = await supabase
      .from('inventory')
      .select('*')
      .lte('stock_quantity', 5); // or use .lte('stock_quantity', 'low_stock_threshold') if supported

    if (inventoryError) throw inventoryError;

    /** -------------------------------
     * 4️⃣  COWS ASSIGNED (status='assigned')
     * ------------------------------- */
    const { count: cowsAssigned, error: cowError } = await supabase
      .from('livestock')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'assigned');

    if (cowError) throw cowError;

    /** -------------------------------
     * 5️⃣  COMPOSE DASHBOARD RESPONSE
     * ------------------------------- */
    res.json({
      upcoming: funeralsCount || 0,
      vehiclesNeeded: funeralsCount || 0, // same as upcoming for now
      vehiclesAvailable: vehiclesAvailable || 0,
      conflicts: (vehiclesAvailable || 0) < (funeralsCount || 0),
      lowStock: Array.isArray(lowStock) ? lowStock : [],
      cowsAssigned: cowsAssigned || 0
    });

  } catch (error) {
    console.error('Dashboard route error:', error.message);

    // Always return safe fallback structure
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
