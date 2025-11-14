const express = require('express');
const router = express.Router();

// Get all inventory items
router.get('/', async (req, res) => {
  try {
    const { data, error, count } = await req.app.locals.supabase
      .from('inventory')
      .select('*')
      .order('category')
      .order('name');

    if (error) throw error;

    // Calculate available quantity
    const inventoryWithAvailable = data.map(item => ({
      ...item,
      available_quantity: item.stock_quantity - item.reserved_quantity
    }));

    res.json({ success: true, inventory: inventoryWithAvailable });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get low stock items
router.get('/low-stock', async (req, res) => {
  try {
    const { data, error } = await req.app.locals.supabase
      .from('inventory')
      .select('*')
      .order('stock_quantity', { ascending: true });

    if (error) throw error;

    // Filter low stock items
    const lowStockItems = data.filter(item => 
      (item.stock_quantity - item.reserved_quantity) <= item.low_stock_threshold
    );

    res.json({ success: true, inventory: lowStockItems });
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update inventory stock
router.patch('/:id/stock', async (req, res) => {
  try {
    const { stock_quantity } = req.body;
    
    const { data, error } = await req.app.locals.supabase
      .from('inventory')
      .update({ stock_quantity })
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    if (data.length === 0) {
      return res.status(404).json({ success: false, error: 'Inventory item not found' });
    }

    res.json({ success: true, item: data[0] });
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
    const { data: inventoryData, error: inventoryError } = await req.app.locals.supabase
      .from('inventory')
      .select('stock_quantity, reserved_quantity')
      .eq('id', inventory_id)
      .single();

    if (inventoryError) throw inventoryError;
    if (!inventoryData) {
      return res.status(404).json({ success: false, error: 'Inventory item not found' });
    }

    const available = inventoryData.stock_quantity - inventoryData.reserved_quantity;
    if (available < quantity) {
      return res.status(400).json({ 
        success: false, 
        error: `Insufficient stock. Available: ${available}, Requested: ${quantity}` 
      });
    }

    // Create reservation
    const { data: reservationData, error: reservationError } = await req.app.locals.supabase
      .from('reservations')
      .insert([
        { 
          case_id, 
          inventory_id, 
          quantity,
          status: 'reserved'
        }
      ])
      .select();

    if (reservationError) throw reservationError;

    // Update reserved quantity
    const { error: updateError } = await req.app.locals.supabase
      .from('inventory')
      .update({ reserved_quantity: inventoryData.reserved_quantity + quantity })
      .eq('id', inventory_id);

    if (updateError) throw updateError;

    res.status(201).json({ success: true, reservation: reservationData[0] });
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;