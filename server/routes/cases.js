// server/routes/cases.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/cases - Create new funeral case
router.post('/', async (req, res) => {
  const {
    deceased_name, deceased_id, nok_name, nok_contact,
    category, plan, members, age, funeral_date, funeral_time,
    venue_name, venue_address, requires_cow, stock_needed
  } = req.body;

  try {
    // 1. Generate case number
    const year = new Date().getFullYear();
    const count = await db('cases').where('case_number', 'like', `THS-${year}-%`).count();
    const case_number = `THS-${year}-${String(count[0].count + 1).padStart(3, '0')}`;

    // 2. Geocode address
    const geo = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(venue_address)}&key=${process.env.GOOGLE_KEY}`).then(r => r.json());
    const { lat, lng } = geo.results[0]?.geometry.location || {};

    // 3. Create case
    const [caseId] = await db('cases').insert({
      case_number, deceased_name, deceased_id, nok_name, nok_contact,
      plan_category: category, plan_name: plan, plan_members: members,
      plan_age_bracket: age, funeral_date, funeral_time,
      venue_name, venue_address, venue_lat: lat, venue_lng: lng,
      requires_cow, intake_day: new Date().toISOString().split('T')[0]
    }).returning('id');

    // 4. Reserve stock
    for (const [item, qty] of Object.entries(stock_needed)) {
      const inv = await db('inventory').where({ name: item }).first();
      if (inv && inv.stock_quantity >= qty) {
        await db('reservations').insert({ case_id: caseId, inventory_id: inv.id, quantity: qty });
        await db('inventory').where({ id: inv.id }).decrement('stock_quantity', qty).increment('reserved_quantity', qty);
      }
    }

    // 5. Auto-assign cow if needed
    if (requires_cow) {
      const cow = await db('livestock').where({ status: 'available' }).first();
      if (cow) await db('livestock').where({ id: cow.id }).update({ status: 'assigned', assigned_case_id: caseId });
    }

    res.json({ success: true, case_number, caseId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
