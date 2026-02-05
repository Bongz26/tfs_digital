// server/routes/drivers.js
const express = require('express');
const router = express.Router();

// GET all active drivers
router.get('/', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    if (!supabase) throw new Error('Supabase client not available');

    console.log('📞 GET /api/drivers called');

    const { data: drivers, error } = await supabase
      .from('drivers')
      .select('id, name, contact')
      .eq('active', true)
      .order('name');

    if (error) throw error;

    console.log(`✅ Fetched ${(drivers || []).length} active drivers`);
    res.json({ success: true, drivers: drivers || [] });
  } catch (err) {
    console.error('❌ Error fetching drivers:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch drivers',
      details: err.message
    });
  }
});

// GET all drivers (including inactive)
router.get('/all', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    if (!supabase) throw new Error('Supabase client not available');

    const { data: drivers, error } = await supabase
      .from('drivers')
      .select('id, name, contact, active')
      .order('name');

    if (error) throw error;

    res.json({ success: true, drivers: drivers || [] });
  } catch (err) {
    console.error('Error fetching all drivers:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch drivers' });
  }
});

// POST create new driver
router.post('/', async (req, res) => {
  const { name, contact } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: 'Driver name is required' });
  }

  try {
    const supabase = req.app.locals.supabase;
    if (!supabase) throw new Error('Supabase client not available');

    const { data, error } = await supabase
      .from('drivers')
      .insert([{ name, contact: contact || null, active: true }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, driver: data });
  } catch (err) {
    console.error('Error creating driver:', err.message);
    res.status(500).json({ success: false, error: 'Failed to create driver' });
  }
});

// PUT update driver
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, contact, active } = req.body;

  try {
    const supabase = req.app.locals.supabase;
    if (!supabase) throw new Error('Supabase client not available');

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (contact !== undefined) updateData.contact = contact;
    if (active !== undefined) updateData.active = active;

    const { data: driver, error } = await supabase
      .from('drivers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // Handle "row not found" which Supabase might treat as empty or error depending on version? 
      // Usually update returns empty array if no match, .single() throws if 0 or >1
      // But if error code is 'PGRST116' (JSON object requested, multiple (or no) rows returned), it handles not found.
      if (error.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Driver not found' });
      }
      throw error;
    }

    // Safety check just in case
    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    res.json({ success: true, driver });
  } catch (err) {
    console.error('Error updating driver:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update driver' });
  }
});

module.exports = router;
