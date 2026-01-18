// server/routes/dashboard.js
const express = require('express');
const router = express.Router();

let dashboardCache = { data: null, time: 0 };
const DASHBOARD_TTL_MS = 5000;

router.get('/', async (req, res) => {
  try {
    const now = Date.now();
    if (dashboardCache.data && (now - dashboardCache.time) < DASHBOARD_TTL_MS) {
      return res.json(dashboardCache.data);
    }
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

    // 4️⃣ Grocery: total that should be given (by policy) and submitted/scheduled (delivery_date set)
    let groceriesTotal = 0;
    let groceriesSubmitted = 0;
    const activeStatuses = ['intake', 'preparation', 'confirmed', 'in_progress'];
    const minDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const maxDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    try {
      // Simplified approach: Get all active cases first, then filter in JS to be safe and accurate.
      // This avoids complex OR logic issues with Supabase filters for nulls + ranges.
      const { data: activeCases, error: activeErr } = await supabase
        .from('cases')
        .select('id, status, funeral_date, requires_grocery, delivery_date')
        .in('status', activeStatuses);

      if (activeErr) throw activeErr;

      // Filter by date range OR null date in memory
      const groceryEligible = (activeCases || []).filter(c => {
        if (c.requires_grocery !== true) return false;
        if (!c.funeral_date) return true; // Include if no date set yet
        return c.funeral_date >= minDate && c.funeral_date <= maxDate;
      });
      groceriesTotal = groceryEligible.length;

      // Count cases that have a delivery_date set
      groceriesSubmitted = groceryEligible.filter(c => c.delivery_date && c.delivery_date.trim() !== '').length;

    } catch (e) {
      // If supabase path fails, fallback below
      console.warn('⚠️ Grocery stats via Supabase failed:', e.message);
    }

    // 5️⃣ RECENT CASES (configurable limit; default 20)
    const recentLimit = parseInt(req.query.recentLimit || '20', 10);
    const { data: recentCases, error: recentError } = await supabase
      .from('cases')
      .select('id,case_number,deceased_name,status,funeral_date,funeral_time,deceased_id,nok_name,nok_contact,created_at')
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(recentLimit);

    if (recentError) throw recentError;

    // 6️⃣ Oustanding Tasks (Drafts & Intakes) - FORCE LOCAL DB CHECK
    let outstandingDrafts = 0;
    try {
      const { query } = require('../config/db');
      const draftsRes = await query('SELECT COUNT(*)::int as count FROM claim_drafts');
      outstandingDrafts = draftsRes.rows[0]?.count || 0;
    } catch (e) {
      // Fallback to Supabase if local fails
      try {
        const { count } = await supabase.from('claim_drafts').select('*', { count: 'exact', head: true });
        outstandingDrafts = count || 0;
      } catch (_) { }
    }

    let outstandingIntakes = 0;
    try {
      const { query } = require('../config/db');
      const intakeRes = await query("SELECT COUNT(*)::int as count FROM cases WHERE status = 'intake'");
      outstandingIntakes = intakeRes.rows[0]?.count || 0;
    } catch (e) {
      // Fallback to Supabase
      try {
        const { count } = await supabase.from('cases').select('*', { count: 'exact', head: true }).eq('status', 'intake');
        outstandingIntakes = count || 0;
      } catch (_) { }
    }

    const payload = {
      upcoming: funeralsCount || 0,
      vehiclesNeeded: funeralsCount || 0,
      vehiclesAvailable: vehiclesAvailable || 0,
      conflicts: false, // No longer using conflict alerts
      lowStock: Array.isArray(lowStock) ? lowStock : [],
      groceriesTotal,
      groceriesSubmitted,
      recentCases: recentCases || [],
      outstandingDrafts,
      outstandingIntakes
    };
    dashboardCache = { data: payload, time: Date.now() };
    res.json(payload);

  } catch (error) {
    console.error('Dashboard route error:', error);
    // Fallback using direct DB if Supabase fails
    try {
      const { query } = require('../config/db');
      const todaySql = today;
      const gtRes = await query(
        `SELECT COUNT(*)::int AS total 
         FROM cases 
         WHERE requires_grocery = true 
           AND (funeral_date BETWEEN $1 AND $2 OR funeral_date IS NULL)
           AND status IN ('intake','preparation','confirmed','in_progress')`,
        [minDate, maxDate]
      );
      const gsRes = await query(
        `SELECT COUNT(*)::int AS submitted
         FROM cases 
         WHERE requires_grocery = true 
           AND (funeral_date BETWEEN $1 AND $2 OR funeral_date IS NULL)
           AND status IN ('intake','preparation','confirmed','in_progress')
           AND delivery_date IS NOT NULL 
           AND delivery_date <> ''`,
        [minDate, maxDate]
      );

      // Calculate outstanding tasks for local DB
      let outstandingDrafts = 0;
      try {
        const draftsRes = await query('SELECT COUNT(*)::int as count FROM claim_drafts');
        outstandingDrafts = draftsRes.rows[0]?.count || 0;
      } catch (e) {
        // Table might not exist in local DB
      }

      let outstandingIntakes = 0;
      try {
        const intakeRes = await query("SELECT COUNT(*)::int as count FROM cases WHERE status = 'intake'");
        outstandingIntakes = intakeRes.rows[0]?.count || 0;
      } catch (e) { }

      const payload = {
        upcoming: 0,
        vehiclesNeeded: 0,
        vehiclesAvailable: 0,
        conflicts: false,
        lowStock: [],
        groceriesTotal: gtRes.rows[0]?.total || 0,
        groceriesSubmitted: gsRes.rows[0]?.submitted || 0,
        recentCases: [],
        outstandingDrafts,
        outstandingIntakes
      };
      dashboardCache = { data: payload, time: Date.now() };
      return res.json(payload);
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
