// server/routes/vehicles.js
const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

// Get all vehicles
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM vehicles ORDER BY type, reg_number`
    );
    res.json({ success: true, vehicles: result.rows });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get available vehicles
router.get('/available', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM vehicles WHERE available = true ORDER BY type, reg_number`
    );
    res.json({ success: true, vehicles: result.rows });
  } catch (error) {
    console.error('Error fetching available vehicles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create vehicle
router.post('/', async (req, res) => {
  try {
    const { reg_number, type, driver_name, driver_contact, available, current_location, last_service } = req.body;

    // Validate required fields
    if (!reg_number || !type) {
      return res.status(400).json({ 
        success: false, 
        error: 'Registration number and type are required' 
      });
    }

    // Validate type
    const validTypes = ['hearse', 'family_car', 'bus', 'backup'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        success: false, 
        error: `Type must be one of: ${validTypes.join(', ')}` 
      });
    }

    const result = await query(
      `INSERT INTO vehicles (reg_number, type, driver_name, driver_contact, available, current_location, last_service)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        reg_number,
        type,
        driver_name || null,
        driver_contact || null,
        available !== undefined ? available : true,
        current_location || null,
        last_service || null
      ]
    );

    res.status(201).json({ success: true, vehicle: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ 
        success: false, 
        error: 'Vehicle with this registration number already exists' 
      });
    }
    console.error('Error creating vehicle:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single vehicle by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM vehicles WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }
    res.json({ success: true, vehicle: result.rows[0] });
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update vehicle availability
router.patch('/:id/availability', async (req, res) => {
  try {
    const { available } = req.body;
    const result = await query(
      `UPDATE vehicles SET available = $1 WHERE id = $2 RETURNING *`,
      [available, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }
    res.json({ success: true, vehicle: result.rows[0] });
  } catch (error) {
    console.error('Error updating vehicle availability:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update vehicle
router.put('/:id', async (req, res) => {
  try {
    const { driver_name, driver_contact, available, current_location, last_service } = req.body;
    const result = await query(
      `UPDATE vehicles 
       SET driver_name = COALESCE($1, driver_name),
           driver_contact = COALESCE($2, driver_contact),
           available = COALESCE($3, available),
           current_location = COALESCE($4, current_location),
           last_service = COALESCE($5, last_service)
       WHERE id = $6
       RETURNING *`,
      [driver_name, driver_contact, available, current_location, last_service, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }
    res.json({ success: true, vehicle: result.rows[0] });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

