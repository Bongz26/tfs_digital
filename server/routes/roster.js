// server/routes/roster.js
const express = require('express');
const router = express.Router();

// GET ALL ROSTER ENTRIES
router.get('/', async (req, res) => {
  try {
    const { supabase } = req.app.locals;

    // Get roster entries with related data
    const { data: rosterData, error: rosterError } = await supabase
      .from('roster')
      .select('*')
      .order('pickup_time', { ascending: true });

    if (rosterError) {
      console.error('Roster fetch error:', rosterError);
      throw rosterError;
    }

    if (!rosterData || rosterData.length === 0) {
      return res.json([]);
    }

    // Get vehicle and case data separately if joins don't work
    const vehicleIds = [...new Set(rosterData.map(r => r.vehicle_id).filter(Boolean))];
    const caseIds = [...new Set(rosterData.map(r => r.case_id).filter(Boolean))];

    // Fetch vehicles
    let vehicles = {};
    if (vehicleIds.length > 0) {
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, reg_number, driver_name, type')
        .in('id', vehicleIds);

      if (!vehiclesError && vehiclesData) {
        vehiclesData.forEach(v => {
          vehicles[v.id] = v;
        });
      }
    }

    // Fetch cases
    let cases = {};
    if (caseIds.length > 0) {
      const { data: casesData, error: casesError } = await supabase
        .from('cases')
        .select('id, case_number, plan_name, funeral_time, venue_name, funeral_date')
        .in('id', caseIds);

      if (!casesError && casesData) {
        casesData.forEach(c => {
          cases[c.id] = c;
        });
      }
    }

    // Format response
    const formatted = rosterData.map(r => {
      const vehicle = vehicles[r.vehicle_id] || {};
      const caseData = cases[r.case_id] || {};

      return {
        id: r.id,
        case_id: r.case_id,
        vehicle_id: r.vehicle_id,
        reg_number: vehicle.reg_number || null,
        driver_name: r.driver_name || vehicle.driver_name || null,
        vehicle_type: vehicle.type || null,
        case_number: caseData.case_number || null,
        plan_name: caseData.plan_name || null,
        funeral_date: caseData.funeral_date || null,
        funeral_time: caseData.funeral_time || null,
        venue_name: caseData.venue_name || null,
        pickup_time: r.pickup_time,
        status: r.status,
        sms_sent: r.sms_sent || false
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('Roster error:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to fetch roster',
      details: err.details || null
    });
  }
});

// GET ROSTER FOR SPECIFIC CASE
router.get('/case/:caseId', async (req, res) => {
  try {
    const { supabase } = req.app.locals;
    const { caseId } = req.params;

    const { data, error } = await supabase
      .from('roster')
      .select('*')
      .eq('case_id', caseId)
      .order('pickup_time', { ascending: true });

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error('Roster case error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET TODAY'S ROSTER
router.get('/today', async (req, res) => {
  try {
    const { supabase } = req.app.locals;
    const today = new Date().toISOString().split('T')[0];

    // Get roster for cases with funeral_date = today
    const { data: casesData, error: casesError } = await supabase
      .from('cases')
      .select('id')
      .eq('funeral_date', today);

    if (casesError) throw casesError;

    const caseIds = casesData ? casesData.map(c => c.id) : [];

    if (caseIds.length === 0) {
      return res.json([]);
    }

    const { data: rosterData, error: rosterError } = await supabase
      .from('roster')
      .select('*')
      .in('case_id', caseIds)
      .order('pickup_time', { ascending: true });

    if (rosterError) throw rosterError;

    res.json(rosterData || []);
  } catch (err) {
    console.error('Today roster error:', err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE ROSTER ENTRY
router.post('/', async (req, res) => {
  try {
    const { supabase } = req.app.locals;
    const { case_id, vehicle_id, driver_name, pickup_time, route_json, status } = req.body;

    // Validate required fields
    if (!case_id || !vehicle_id) {
      return res.status(400).json({ 
        error: 'case_id and vehicle_id are required' 
      });
    }

    const { data, error } = await supabase
      .from('roster')
      .insert([
        {
          case_id,
          vehicle_id,
          driver_name: driver_name || null,
          pickup_time: pickup_time || null,
          route_json: route_json || null,
          status: status || 'scheduled',
          sms_sent: false
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Update vehicle availability
    await supabase
      .from('vehicles')
      .update({ available: false })
      .eq('id', vehicle_id);

    res.status(201).json(data);
  } catch (err) {
    console.error('Create roster error:', err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE ROSTER ENTRY
router.put('/:id', async (req, res) => {
  try {
    const { supabase } = req.app.locals;
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('roster')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Roster entry not found' });
    }

    res.json(data);
  } catch (err) {
    console.error('Update roster error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE ROSTER ENTRY
router.delete('/:id', async (req, res) => {
  try {
    const { supabase } = req.app.locals;
    const { id } = req.params;

    // Get vehicle_id before deleting
    const { data: rosterData } = await supabase
      .from('roster')
      .select('vehicle_id')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('roster')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Mark vehicle as available
    if (rosterData && rosterData.vehicle_id) {
      await supabase
        .from('vehicles')
        .update({ available: true })
        .eq('id', rosterData.vehicle_id);
    }

    res.json({ success: true, message: 'Roster entry deleted' });
  } catch (err) {
    console.error('Delete roster error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;