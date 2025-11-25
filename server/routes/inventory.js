const express = require('express');
const router = express.Router();
const { requireAuth, requireMinRole, ROLES } = require('../middleware/auth');
const { body, param } = require('express-validator');
const { validationResult } = require('express-validator');

const validate = (rules) => [
  ...rules,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    next();
  }
];
const inventoryController = require('../controllers/inventoryController');

// GET all inventory
router.get('/', requireAuth, requireMinRole(ROLES.STAFF), inventoryController.getAllInventory);

// GET inventory stats
router.get('/stats', requireAuth, requireMinRole(ROLES.STAFF), inventoryController.getInventoryStats);

// POST create new inventory item
router.post(
  '/',
  requireAuth,
  requireMinRole(ROLES.MANAGER),
  validate([
    body('name').isString().trim().notEmpty(),
    body('category').isString().trim().notEmpty(),
    body('stock_quantity').optional().isInt({ min: 0 }),
    body('low_stock_threshold').optional().isInt({ min: 0 }),
    body('unit_price').optional().isFloat({ min: 0 })
  ]),
  inventoryController.createInventoryItem
);

// GET single inventory item
router.get('/:id', requireAuth, requireMinRole(ROLES.STAFF), inventoryController.getInventoryItem);

// PUT update inventory item
router.put(
  '/:id',
  requireAuth,
  requireMinRole(ROLES.MANAGER),
  validate([
    param('id').isInt({ gt: 0 }),
    body('name').optional().isString().trim().notEmpty(),
    body('category').optional().isString().trim().notEmpty(),
    body('stock_quantity').optional().isInt({ min: 0 }),
    body('reserved_quantity').optional().isInt({ min: 0 }),
    body('unit_price').optional().isFloat({ min: 0 })
  ]),
  inventoryController.updateInventoryItem
);

// DELETE inventory item
router.delete('/:id', requireAuth, requireMinRole(ROLES.MANAGER), inventoryController.deleteInventoryItem);

// PATCH update stock quantity
router.patch(
  '/:id/stock',
  requireAuth,
  requireMinRole(ROLES.MANAGER),
  validate([
    param('id').isInt({ gt: 0 }),
    body('stock_quantity').isInt({ min: 0 })
  ]),
  inventoryController.updateStockQuantity
);

// POST adjust stock
router.post(
  '/:id/adjust',
  requireAuth,
  requireMinRole(ROLES.MANAGER),
  validate([
    param('id').isInt({ gt: 0 }),
    body('adjustment').isInt().not().equals(0),
    body('reason').optional().isString().trim().notEmpty()
  ]),
  inventoryController.adjustStock
);

// GET list open stock takes
router.get('/stock-take/open', requireAuth, requireMinRole(ROLES.STAFF), inventoryController.getOpenStockTakes);

// POST start stock take
router.post('/stock-take/start', requireAuth, requireMinRole(ROLES.MANAGER), inventoryController.startStockTake);

// PUT update stock take item (record physical count)
router.put('/stock-take/:id/item/:itemId', requireAuth, requireMinRole(ROLES.MANAGER), inventoryController.updateStockTakeItem);

// GET specific stock take with items (must be before POST routes)
router.get('/stock-take/:id', requireAuth, requireMinRole(ROLES.STAFF), inventoryController.getStockTake);

// POST cancel stock take
router.post('/stock-take/:id/cancel', requireAuth, requireMinRole(ROLES.MANAGER), inventoryController.cancelStockTake);

// POST complete stock take
router.post('/stock-take/:id/complete', requireAuth, requireMinRole(ROLES.MANAGER), inventoryController.completeStockTake);

module.exports = router;
