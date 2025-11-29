const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// GET all inventory
router.get('/', inventoryController.getAllInventory);

// GET inventory stats
router.get('/stats', inventoryController.getInventoryStats);

// POST create new inventory item
router.post('/', inventoryController.createInventoryItem);

// GET single inventory item
router.get('/:id', inventoryController.getInventoryItem);

// PUT update inventory item
router.put('/:id', inventoryController.updateInventoryItem);

// DELETE inventory item
router.delete('/:id', inventoryController.deleteInventoryItem);

// PATCH update stock quantity
router.patch('/:id/stock', inventoryController.updateStockQuantity);

// POST adjust stock
router.post('/:id/adjust', inventoryController.adjustStock);

// GET list open stock takes
router.get('/stock-take/open', inventoryController.getOpenStockTakes);

// POST start stock take
router.post('/stock-take/start', inventoryController.startStockTake);

// PUT update stock take item (record physical count)
router.put('/stock-take/:id/item/:itemId', inventoryController.updateStockTakeItem);

// GET specific stock take with items (must be before POST routes)
router.get('/stock-take/:id', inventoryController.getStockTake);

// POST cancel stock take
router.post('/stock-take/:id/cancel', inventoryController.cancelStockTake);

// POST complete stock take
router.post('/stock-take/:id/complete', inventoryController.completeStockTake);

module.exports = router;
