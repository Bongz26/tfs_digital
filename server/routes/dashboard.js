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

    // 4️⃣ Grocery: total that should be given (by policy) and submitted (checklist)
    let groceriesTotal = 0;
    let groceriesSubmitted = 0;
    try {
      const { data: groceryCases, error: groceryCasesErr, count: groceryCount } = await supabase
        .from('cases')
        .select('id', { count: 'exact' })
        .eq('requires_grocery', true)
        .gte('funeral_date', today);
      if (groceryCasesErr) throw groceryCasesErr;
      groceriesTotal = groceryCount || (groceryCases ? groceryCases.length : 0);
      const caseIds = (groceryCases || []).map(c => c.id);
      if (caseIds.length > 0) {
        const { data: checklistRows, error: checklistErr } = await supabase
          .from('checklist')
          .select('case_id, task, completed')
          .in('case_id', caseIds)
          .eq('completed', true);
        if (checklistErr) throw checklistErr;
        const submittedCaseIds = new Set(
          (checklistRows || [])
            .filter(r => String(r.task || '').toLowerCase().startsWith('grocery'))
            .map(r => r.case_id)
        );
        groceriesSubmitted = submittedCaseIds.size;
      }
    } catch (e) {
      // If supabase path fails, fallback below
      console.warn('⚠️ Grocery stats via Supabase failed:', e.message);
    }

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
      groceriesTotal,
      groceriesSubmitted,
      recentCases: recentCases || []
    });

  } catch (error) {
    console.error('Dashboard route error:', error);
    // Fallback using direct DB if Supabase fails
    try {
      const { query } = require('../config/db');
      const todaySql = today;
      const gtRes = await query(
        `SELECT COUNT(*)::int AS total FROM cases WHERE requires_grocery = true AND funeral_date >= $1`,
        [todaySql]
      );
      const gsRes = await query(
        `SELECT COUNT(DISTINCT c.id)::int AS submitted
         FROM cases c
         JOIN checklist cl ON cl.case_id = c.id
         WHERE c.requires_grocery = true
           AND c.funeral_date >= $1
           AND cl.completed = true
           AND LOWER(cl.task) LIKE 'grocery%'`,
        [todaySql]
      );
      return res.json({
        upcoming: 0,
        vehiclesNeeded: 0,
        vehiclesAvailable: 0,
        conflicts: false,
        lowStock: [],
        groceriesTotal: gtRes.rows[0]?.total || 0,
        groceriesSubmitted: gsRes.rows[0]?.submitted || 0,
        recentCases: []
      });
    } catch (fallbackErr) {
      console.error('Dashboard route error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        upcoming: 0,
        vehiclesNeeded: 0,
        vehiclesAvailable: 0,
        conflicts: false,
        lowStock: [],
        groceriesTotal: 0,
        groceriesSubmitted: 0,
        recentCases: []
      });
    }
  }
});

module.exports = router;
