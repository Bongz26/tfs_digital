const express = require('express');
const router = express.Router();

// POST /api/cases/assign/:caseId
router.post('/assign/:caseId', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;
    const { caseId } = req.params;
    const { vehicle_id, driver_name, pickup_time } = req.body;

    // Insert into roster table
    const { data, error } = await supabase
      .from('roster')
      .insert([
        {
          case_id: caseId,
          vehicle_id: vehicle_id,
          driver_name: driver_name,
          pickup_time: pickup_time,
          status: 'assigned'
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