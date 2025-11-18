// server/routes/drivers.js
const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

// GET all active drivers
router.get('/', async (req, res) => {
  try {
    // First check if table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'drivers'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.warn('⚠️  Drivers table does not exist');
      return res.json({ 
        success: true, 
        drivers: [],
        message: 'Drivers table does not exist. Run the schema migration first.'
      });
    }
    
    const result = await query(
      'SELECT id, name, contact, license_number FROM drivers WHERE active = true ORDER BY name'
    );
    
    console.log(`✅ Fetched ${result.rows.length} active drivers`);
    res.json({ success: true, drivers: result.rows });
  } catch (err) {
    console.error('❌ Error fetching drivers:', err);
    console.error('Error details:', err.message);
    
    // If table doesn't exist, return empty array instead of error
    if (err.message.includes('does not exist') || err.message.includes('relation') || err.code === '42P01') {
      console.warn('⚠️  Drivers table does not exist');
      return res.json({ 
        success: true, 
        drivers: [],
        message: 'Drivers table does not exist. Please run the database migration.'
      });
    }
    
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
    const result = await query(
      'SELECT id, name, contact, license_number, active FROM drivers ORDER BY name'
    );
    res.json({ success: true, drivers: result.rows });
  } catch (err) {
    console.error('Error fetching all drivers:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch drivers' });
  }
});

// POST create new driver
router.post('/', async (req, res) => {
  const { name, contact, license_number } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: 'Driver name is required' });
  }

  try {
    const result = await query(
      `INSERT INTO drivers (name, contact, license_number, active)
       VALUES ($1, $2, $3, true)
       RETURNING *`,
      [name, contact || null, license_number || null]
    );
    res.status(201).json({ success: true, driver: result.rows[0] });
  } catch (err) {
    console.error('Error creating driver:', err);
    res.status(500).json({ success: false, error: 'Failed to create driver' });
  }
});

// PUT update driver
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, contact, license_number, active } = req.body;

  try {
    const result = await query(
      `UPDATE drivers 
       SET name = COALESCE($1, name),
           contact = COALESCE($2, contact),
           license_number = COALESCE($3, license_number),
           active = COALESCE($4, active)
       WHERE id = $5
       RETURNING *`,
      [name, contact, license_number, active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    res.json({ success: true, driver: result.rows[0] });
  } catch (err) {
    console.error('Error updating driver:', err);
    res.status(500).json({ success: false, error: 'Failed to update driver' });
  }
});

module.exports = router;

