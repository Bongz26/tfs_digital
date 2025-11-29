// server/routes/dashboard.js
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const today = new Date().toISOString().split('T')[0];

    // 1️⃣ Upcoming Funerals
    const { count: funeralsCount, error: casesError } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .gte('funeral_date', today);

    if (casesError) throw casesError;

    // 2️⃣ Vehicles Available - Count vehicles NOT assigned to any active case
    // Get all vehicles
    const { data: allVehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id');

    if (vehiclesError) throw vehiclesError;

    // Get all active roster assignments (non-completed)
    const { data: activeAssignments, error: rosterError } = await supabase
      .from('roster')
      .select('vehicle_id')
      .neq('status', 'completed');

    if (rosterError) throw rosterError;

    // Find vehicles that are assigned
    const assignedVehicleIds = new Set(
      (activeAssignments || []).map(a => a.vehicle_id).filter(id => id !== null)
    );

    // Count vehicles not assigned to any active case
    const vehiclesAvailable = (allVehicles || []).filter(v => !assignedVehicleIds.has(v.id)).length;

    // 3️⃣ Low Stock Items
    const { data: lowStock, error: inventoryError } = await supabase
      .from('inventory')
      .select('*')
      .lte('stock_quantity', 5);

    if (inventoryError) throw inventoryError;

    // 4️⃣ Grocery Assigned
    const { count: cowsAssigned, error: cowError } = await supabase
      .from('livestock')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'assigned');

    if (cowError) throw cowError;

    // 5️⃣ RECENT CASES (last 5 created)
    const { data: recentCases, error: recentError } = await supabase
      .from('cases')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) throw recentError;

    res.json({
      upcoming: funeralsCount || 0,
      vehiclesNeeded: funeralsCount || 0,
      vehiclesAvailable: vehiclesAvailable || 0,
      conflicts: false, // No longer using conflict alerts
      lowStock: Array.isArray(lowStock) ? lowStock : [],
      cowsAssigned: cowsAssigned || 0,
      recentCases: recentCases || []
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
      recentCases: []
    });
  }
});

module.exports = router;