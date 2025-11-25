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
const purchaseOrdersController = require('../controllers/purchaseOrdersController');

// --- GET ALL SUPPLIERS ---
router.get('/suppliers', requireAuth, requireMinRole(ROLES.STAFF), purchaseOrdersController.getSuppliers);

// --- CREATE NEW PURCHASE ORDER ---
router.post(
  '/',
  requireAuth,
  requireMinRole(ROLES.MANAGER),
  validate([
    body('po_number').isString().trim().notEmpty(),
    body('supplier_id').isInt({ gt: 0 }),
    body('order_date').isString().notEmpty(),
    body('expected_delivery').optional().isString()
  ]),
  purchaseOrdersController.createPurchaseOrder
);

// --- ADD ITEM TO PURCHASE ORDER ---
router.post(
  '/:poId/items',
  requireAuth,
  requireMinRole(ROLES.MANAGER),
  validate([
    param('poId').isInt({ gt: 0 }),
    body('inventory_id').isInt({ gt: 0 }),
    body('quantity_ordered').isInt({ gt: 0 }),
    body('unit_cost').isFloat({ gt: 0 })
  ]),
  purchaseOrdersController.addPOItem
);

// --- RECEIVE GRV (Update Inventory & Stock Movements) ---
router.post(
  '/:poId/receive',
  requireAuth,
  requireMinRole(ROLES.MANAGER),
  validate([
    param('poId').isInt({ gt: 0 }),
    body('received_by').isString().trim().notEmpty(),
    body('received_items').isArray({ min: 1 }),
    body('received_items.*.inventory_id').isInt({ gt: 0 }),
    body('received_items.*.quantity_received').isInt({ gt: 0 })
  ]),
  purchaseOrdersController.receiveGRV
);

// --- GET ALL PURCHASE ORDERS WITH ITEMS ---
router.get('/', requireAuth, requireMinRole(ROLES.STAFF), purchaseOrdersController.getAllPurchaseOrders);

// --- PROCESS/SEND PURCHASE ORDER (Email to Supplier) ---
router.post('/:poId/process', requireAuth, requireMinRole(ROLES.MANAGER), purchaseOrdersController.processPurchaseOrder);

// --- FETCH ITEMS FROM SUPPLIER SYSTEM ---
router.get('/suppliers/:supplierId/items', requireAuth, requireMinRole(ROLES.STAFF), purchaseOrdersController.getSupplierItems);

// --- TEST ENDPOINT ---
router.get('/test', (req, res) => {
  res.json({ message: 'Purchase Orders API is working' });
});

// --- UPDATE PURCHASE ORDER ---
router.put(
  '/:id',
  requireAuth,
  requireMinRole(ROLES.MANAGER),
  validate([
    param('id').isInt({ gt: 0 }),
    body('po_number').optional().isString().trim().notEmpty(),
    body('order_date').optional().isString().notEmpty(),
    body('expected_delivery').optional().isString()
  ]),
  purchaseOrdersController.updatePurchaseOrder
);

// --- DELETE PURCHASE ORDER ---
router.delete('/:id', requireAuth, requireMinRole(ROLES.MANAGER), purchaseOrdersController.deletePurchaseOrder);

module.exports = router;
