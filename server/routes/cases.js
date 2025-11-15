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

// GET /api/cases/:id - Get single case by ID
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

// ✅ ADD THIS POST ROUTE - Create new case
// POST /api/cases
router.post('/', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const caseData = req.body;

    console.log("📌 Received caseData:", caseData);

    // Generate case number (THS-YYYY-XXX)
    const today = new Date();
    const year = today.getFullYear();

    const { data: latestCase, error: latestError } = await supabase
      .from('cases')
      .select('case_number')
      .order('created_at', { ascending: false })
      .limit(1);

    if (latestError) throw latestError;

    let caseNumber;
    if (latestCase && latestCase.length > 0) {
      const lastNumber = parseInt(latestCase[0].case_number.split('-')[2]) || 0;
      caseNumber = `THS-${year}-${String(lastNumber + 1).padStart(3, '0')}`;
    } else {
      caseNumber = `THS-${year}-001`;
    }

    // Prepare data for insertion
    const insertData = {
      ...caseData,
      case_number: caseNumber,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log("📌 Insert payload:", insertData);

    // Insert into database
    const { data, error } = await supabase
      .from('cases')
      .insert([insertData])
      .select();

    if (error) {
      console.error("❌ Supabase insert ERROR:");
      console.error("message:", error.message);
      console.error("details:", error.details);
      console.error("hint:", error.hint);
      console.error("code:", error.code);
      return res.status(500).json({ success: false, error });
    }

    console.log('Case created successfully:', data);
    res.json({
      success: true,
      message: 'Case created successfully',
      case: data[0]
    });

  } catch (err) {
    console.error('Create case error:', err);
    res.status(500).json({
      success: false,
      error: err
    });
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