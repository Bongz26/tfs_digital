// server/routes/cases.js
const express = require('express');
const router = express.Router();

// GET /api/cases - Get all cases
router.get('/', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, cases: data });
  } catch (err) {
    console.error('Cases fetch error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ ADD THIS - Get single case by ID
// GET /api/cases/:id
router.get('/:id', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const caseId = req.params.id;

    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (error) {
      console.error('Single case fetch error:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }

    if (!data) {
      return res.status(404).json({ success: false, error: 'Case not found' });
    }

    res.json({ success: true, case: data });
  } catch (err) {
    console.error('Single case fetch error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/cases/assign/:caseId - Assign vehicle to case
router.post('/assign/:caseId', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const { caseId } = req.params;
    const { vehicle_id, driver_name, pickup_time } = req.body;

    const { data, error } = await supabase
      .from('roster')
      .insert([
        {
          case_id: caseId,
          vehicle_id: vehicle_id,
          driver_name: driver_name,
          pickup_time: pickup_time,
          status: 'scheduled'
        }
      ])
      .select();

    if (error) throw error;

    res.json({ success: true, roster: data });
  } catch (err) {
    console.error('Assign vehicle error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;