const express = require('express');
const router = express.Router();
const { query, getClient } = require('../config/db');

// GET all inventory
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let sql = 'SELECT * FROM inventory';
    const params = [];
    
    if (category && category !== 'all') {
      sql += ' WHERE category = $1';
      params.push(category);
    }
    
    sql += ' ORDER BY category, name';
    
    const result = await query(sql, params);
    res.json({ success: true, inventory: result.rows || [] });
  } catch (err) {
    console.error('❌ Error fetching inventory:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch inventory', details: err.message });
  }
});

// GET inventory stats
router.get('/stats', async (req, res) => {
  try {
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_items,
        SUM(CASE WHEN stock_quantity <= low_stock_threshold THEN 1 ELSE 0 END) as low_stock_count,
        SUM(stock_quantity) as total_stock,
        COUNT(DISTINCT category) as categories
      FROM inventory
    `);
    
    const stats = statsResult.rows[0] || {
      total_items: 0,
      low_stock_count: 0,
      total_stock: 0,
      categories: 0
    };
    
    res.json({ success: true, stats });
  } catch (err) {
    console.error('❌ Error fetching inventory stats:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch inventory stats', details: err.message });
  }
});

// PATCH update stock quantity
router.patch('/:id/stock', async (req, res) => {
  const { id } = req.params;
  const { stock_quantity } = req.body;

  try {
    const itemResult = await query('SELECT stock_quantity, low_stock_threshold FROM inventory WHERE id=$1', [id]);
    if (!itemResult.rows.length) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    await query('UPDATE inventory SET stock_quantity=$1, updated_at=NOW() WHERE id=$2', [stock_quantity, id]);

    const is_low_stock = stock_quantity <= itemResult.rows[0].low_stock_threshold;
    res.json({ success: true, stock_quantity, is_low_stock });
  } catch (err) {
    console.error('❌ Error updating stock:', err);
    res.status(500).json({ success: false, error: 'Failed to update stock', details: err.message });
  }
});

// POST adjust stock
router.post('/:id/adjust', async (req, res) => {
  const { id } = req.params;
  const { quantity_change, reason, case_id, recorded_by } = req.body;

  try {
    const itemResult = await query('SELECT stock_quantity, low_stock_threshold FROM inventory WHERE id=$1', [id]);
    if (!itemResult.rows.length) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    const previous_quantity = itemResult.rows[0].stock_quantity;
    const new_quantity = previous_quantity + quantity_change;

    await query('UPDATE inventory SET stock_quantity=$1, updated_at=NOW() WHERE id=$2', [new_quantity, id]);

    // Insert stock movement if stock_movements table exists
    try {
      await query(
        `INSERT INTO stock_movements 
         (inventory_id, case_id, movement_type, quantity_change, previous_quantity, new_quantity, reason, recorded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, case_id || null, 'adjustment', quantity_change, previous_quantity, new_quantity, reason || 'Manual adjustment', recorded_by || 'system']
      );
    } catch (movementErr) {
      // If stock_movements table doesn't exist, just log and continue
      console.warn('⚠️  Could not log stock movement (table may not exist):', movementErr.message);
    }

    const is_low_stock = new_quantity <= itemResult.rows[0].low_stock_threshold;
    res.json({ success: true, new_quantity, is_low_stock });
  } catch (err) {
    console.error('❌ Error adjusting stock:', err);
    res.status(500).json({ success: false, error: 'Failed to adjust stock', details: err.message });
  }
});

// POST start stock take
router.post('/stock-take/start', async (req, res) => {
  const { taken_by } = req.body;

  try {
    const take = await query(
      `INSERT INTO stock_takes (taken_by) VALUES ($1) RETURNING id, created_at`,
      [taken_by]
    );

    // Insert stock take items and fetch inventory details in one query using JOIN
    const itemsResult = await query(
      `INSERT INTO stock_take_items (stock_take_id, inventory_id, system_quantity)
       SELECT $1, i.id, i.stock_quantity 
       FROM inventory i
       RETURNING stock_take_items.*`,
      [take.rows[0].id]
    );

    // Fetch all items with inventory details using JOIN
    // Use same structure as inventory endpoint: name, category, sku (not inventory_name)
    const itemsWithDetails = await query(
      `SELECT 
         sti.id,
         sti.stock_take_id,
         sti.inventory_id,
         sti.system_quantity,
         sti.physical_quantity,
         sti.difference,
         sti.notes,
         sti.created_at,
         i.name,
         i.category,
         i.sku
       FROM stock_take_items sti
       INNER JOIN inventory i ON sti.inventory_id = i.id
       WHERE sti.stock_take_id = $1
       ORDER BY i.category, i.name`,
      [take.rows[0].id]
    );

    console.log('📦 Stock take response - items count:', itemsWithDetails.rows.length);
    if (itemsWithDetails.rows.length > 0) {
      console.log('📦 First item keys:', Object.keys(itemsWithDetails.rows[0]));
      console.log('📦 First item:', JSON.stringify(itemsWithDetails.rows[0], null, 2));
    }

    res.json({ success: true, stock_take_id: take.rows[0].id, items: itemsWithDetails.rows });
  } catch (err) {
    console.error('❌ Error starting stock take:', err);
    res.status(500).json({ success: false, error: 'Failed to start stock take', details: err.message });
  }
});

// PUT update stock take item (record physical count)
router.put('/stock-take/:id/item/:itemId', async (req, res) => {
  const { id, itemId } = req.params;
  const { physical_quantity, notes } = req.body;

  try {
    const result = await query(
      `UPDATE stock_take_items
       SET physical_quantity = $1,
           difference = $1 - system_quantity,
           notes = $2
       WHERE stock_take_id = $3 AND inventory_id = $4
       RETURNING *`,
      [physical_quantity, notes, id, itemId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'Stock take item not found' });
    }

    // Fetch inventory item details using JOIN - use same structure as inventory endpoint
    const itemWithDetails = await query(
      `SELECT 
         sti.id,
         sti.stock_take_id,
         sti.inventory_id,
         sti.system_quantity,
         sti.physical_quantity,
         sti.difference,
         sti.notes,
         sti.created_at,
         i.name,
         i.category,
         i.sku
       FROM stock_take_items sti
       INNER JOIN inventory i ON sti.inventory_id = i.id
       WHERE sti.stock_take_id = $1 AND sti.inventory_id = $2`,
      [id, itemId]
    );

    if (!itemWithDetails.rows.length) {
      return res.status(404).json({ success: false, error: 'Stock take item not found' });
    }

    res.json({ success: true, item: itemWithDetails.rows[0] });
  } catch (err) {
    console.error('❌ Error updating stock take item:', err);
    res.status(500).json({ success: false, error: 'Failed to update count', details: err.message });
  }
});

// POST complete stock take (apply adjustments to inventory)
router.post('/stock-take/:id/complete', async (req, res) => {
  const { id } = req.params;
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Get all items from this stock take
    const items = await client.query(
      `SELECT * FROM stock_take_items WHERE stock_take_id = $1`,
      [id]
    );

    // Update inventory for each item that has a physical count
    for (const item of items.rows) {
      if (item.physical_quantity === null) continue;

      // Update inventory stock quantity
      await client.query(
        `UPDATE inventory
         SET stock_quantity = $1, updated_at = NOW()
         WHERE id = $2`,
        [item.physical_quantity, item.inventory_id]
      );

      // Log stock movement if stock_movements table exists
      try {
        await client.query(
          `INSERT INTO stock_movements 
           (inventory_id, movement_type, quantity_change, previous_quantity, new_quantity, reason)
           VALUES ($1, 'adjustment', $2, $3, $4, 'Stock Take Adjustment')`,
          [
            item.inventory_id,
            item.physical_quantity - item.system_quantity,
            item.system_quantity,
            item.physical_quantity
          ]
        );
      } catch (movementErr) {
        // If stock_movements table doesn't exist, just log and continue
        console.warn('⚠️  Could not log stock movement (table may not exist):', movementErr.message);
      }
    }

    // Mark stock take as completed
    await client.query(
      `UPDATE stock_takes SET status='completed' WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');

    res.json({ success: true, message: 'Stock take completed', items_updated: items.rows.filter(i => i.physical_quantity !== null).length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error completing stock take:', err);
    res.status(500).json({ success: false, error: 'Failed to complete stock take', details: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
