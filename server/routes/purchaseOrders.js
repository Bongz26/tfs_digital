const express = require('express');
const router = express.Router();
const purchaseOrdersController = require('../controllers/purchaseOrdersController');

// --- GET ALL SUPPLIERS ---
router.get('/suppliers', purchaseOrdersController.getSuppliers);

// --- CREATE NEW PURCHASE ORDER ---
router.post('/', purchaseOrdersController.createPurchaseOrder);

// --- ADD ITEM TO PURCHASE ORDER ---
router.post('/:poId/items', purchaseOrdersController.addPOItem);

// --- RECEIVE GRV (Update Inventory & Stock Movements) ---
router.post('/:poId/receive', purchaseOrdersController.receiveGRV);

// --- GET ALL PURCHASE ORDERS WITH ITEMS ---
router.get('/', purchaseOrdersController.getAllPurchaseOrders);

// --- PROCESS/SEND PURCHASE ORDER (Email to Supplier) ---
router.post('/:poId/process', purchaseOrdersController.processPurchaseOrder);

// --- FETCH ITEMS FROM SUPPLIER SYSTEM ---
router.get('/suppliers/:supplierId/items', purchaseOrdersController.getSupplierItems);

// --- TEST ENDPOINT ---
router.get('/test', (req, res) => {
  res.json({ message: 'Purchase Orders API is working' });
});

// --- UPDATE PURCHASE ORDER ---
router.put('/:id', purchaseOrdersController.updatePurchaseOrder);

// --- DELETE PURCHASE ORDER ---
router.delete('/:id', purchaseOrdersController.deletePurchaseOrder);

module.exports = router;
