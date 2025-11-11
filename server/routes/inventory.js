// server/routes/inventory.js
const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

// Get all inventory items
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT *, (stock_quantity - reserved_quantity) as available_quantity
       FROM inventory 
       ORDER BY category, name`
    );
    res.json({ success: true, inventory: result.rows });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get low stock items
router.get('/low-stock', async (req, res) => {
  try {
    const result = await query(
      `SELECT *, (stock_quantity - reserved_quantity) as available_quantity
       FROM inventory 
       WHERE (stock_quantity - reserved_quantity) <= low_stock_threshold
       ORDER BY (stock_quantity - reserved_quantity) ASC`
    );
    res.json({ success: true, inventory: result.rows });
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single inventory item by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT *, (stock_quantity - reserved_quantity) as available_quantity
       FROM inventory WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Inventory item not found' });
    }
    res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update inventory stock
router.patch('/:id/stock', async (req, res) => {
  try {
    const { stock_quantity } = req.body;
    const result = await query(
      `UPDATE inventory SET stock_quantity = $1 WHERE id = $2 RETURNING *`,
      [stock_quantity, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Inventory item not found' });
    }
    res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('Error updating inventory stock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create reservation
router.post('/:id/reserve', async (req, res) => {
  try {
    const { case_id, quantity } = req.body;
    const inventory_id = req.params.id;

    // Check available stock
    const inventoryResult = await query(
      `SELECT stock_quantity, reserved_quantity FROM inventory WHERE id = $1`,
      [inventory_id]
    );
    if (inventoryResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Inventory item not found' });
    }

    const available = inventoryResult.rows[0].stock_quantity - inventoryResult.rows[0].reserved_quantity;
    if (available < quantity) {
      return res.status(400).json({ 
        success: false, 
        error: `Insufficient stock. Available: ${available}, Requested: ${quantity}` 
      });
    }

    // Create reservation
    const reservationResult = await query(
      `INSERT INTO reservations (case_id, inventory_id, quantity)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [case_id, inventory_id, quantity]
    );

    // Update reserved quantity
    await query(
      `UPDATE inventory 
       SET reserved_quantity = reserved_quantity + $1 
       WHERE id = $2`,
      [quantity, inventory_id]
    );

    res.status(201).json({ success: true, reservation: reservationResult.rows[0] });
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

