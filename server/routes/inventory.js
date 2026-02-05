const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// GET all inventory
router.get('/', inventoryController.getAllInventory);

// GET inventory stats
router.get('/stats', inventoryController.getInventoryStats);
router.get('/low-stock', inventoryController.getLowStockDetailed);
router.get('/movements', inventoryController.getStockMovements);
router.get('/coffin-usage-by-case', inventoryController.getCoffinUsageByCase);
router.get('/coffin-usage-raw', inventoryController.getCoffinUsageRaw);
router.post('/coffin-usage/backfill', inventoryController.backfillCoffinMovementsToCases);
router.post('/coffin-usage/backfill/create', inventoryController.createCoffinMovementsForCases);

// POST create new inventory item
router.post('/', inventoryController.createInventoryItem);

// POST replace inventory with preset list (admin/manager intent)
router.post('/replace', inventoryController.replaceInventoryWithPreset);

// --- STOCK TRANSFERS & DISPATCH ---
// Must be before /:id because "transfers" is not an ID
router.get('/transfers', inventoryController.getTransfers);
router.post('/transfers/create', inventoryController.createTransfer);
router.post('/transfers/:id/dispatch', inventoryController.dispatchTransfer);
router.post('/transfers/:id/receive', inventoryController.receiveTransfer);
router.post('/transfers/:id/cancel', inventoryController.cancelTransfer);
router.put('/transfers/:id', inventoryController.updateTransfer);

// POST email weekly report manual trigger
router.post('/reports/email', inventoryController.sendWeeklyReportManual);

// POST email stock report manual trigger
router.post('/reports/stock-email', inventoryController.sendStockReportManual);

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

// POST complete stock take
router.post('/stock-take/:id/complete', inventoryController.completeStockTake);

// GET completed stock takes (Must be before /stock-take/:id)
router.get('/stock-take/completed', inventoryController.getCompletedStockTakes);

// GET specific stock take with items (must be before POST routes)
router.get('/stock-take/:id', inventoryController.getStockTake);

// POST cancel stock take
router.post('/stock-take/:id/cancel', inventoryController.cancelStockTake);

// POST complete stock take
router.post('/stock-take/:id/complete', inventoryController.completeStockTake);

// Routes for transfers and reports moved up.

module.exports = router;
