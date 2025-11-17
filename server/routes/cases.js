const express = require('express');
const router = express.Router();
const pool = require('../database/db');

// GET all cases
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cases ORDER BY funeral_date DESC');
    res.json({ success: true, cases: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch cases' });
  }
});

// POST new case
router.post('/', async (req, res) => {
  const {
    case_number, deceased_name, deceased_id, nok_name, nok_contact, nok_relation,
    plan_category, plan_name, plan_members, plan_age_bracket,
    funeral_date, funeral_time, venue_name, venue_address, venue_lat, venue_lng,
    requires_cow, requires_tombstone, service_type, total_price, casket_type,
    casket_colour, delivery_date, delivery_time
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO cases 
       (case_number, deceased_name, deceased_id, nok_name, nok_contact, nok_relation,
        plan_category, plan_name, plan_members, plan_age_bracket,
        funeral_date, funeral_time, venue_name, venue_address, venue_lat, venue_lng,
        requires_cow, requires_tombstone, service_type, total_price,
        casket_type, casket_colour, delivery_date, delivery_time)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
       RETURNING *`,
      [case_number, deceased_name, deceased_id, nok_name, nok_contact, nok_relation,
       plan_category, plan_name, plan_members, plan_age_bracket,
       funeral_date, funeral_time, venue_name, venue_address, venue_lat, venue_lng,
       requires_cow, requires_tombstone, service_type, total_price,
       casket_type, casket_colour, delivery_date, delivery_time]
    );
    res.json({ success: true, case: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to create case' });
  }
});

module.exports = router;
