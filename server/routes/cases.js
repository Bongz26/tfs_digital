const express = require('express');
const router = express.Router();
const casesController = require('../controllers/casesController');

// Lookup case by identifiers for auto-fill
router.get('/lookup', casesController.lookupCase);

router.get('/search', casesController.searchCases);

// GET all cases
router.get('/', casesController.getAllCases);

// POST new case
router.post('/', casesController.createCase);

// POST assign vehicle to case (creates roster entry)
router.post('/assign/:caseId', casesController.assignVehicle);

// PATCH update case status
router.patch('/:id/status', casesController.updateCaseStatus);

// PATCH update funeral time (only if status is 'intake')
router.patch('/:id/funeral-time', casesController.updateFuneralTime);

// PATCH update venue and burial place
router.patch('/:id/venue', casesController.updateCaseVenue);

router.get('/list/cancelled', casesController.getCancelledCases);

// GET audit log for case
router.get('/:id/audit-log', casesController.getCaseAuditLog);
router.get('/audit/:id', casesController.getCaseAuditLog);

// GET single case by ID (must come last to avoid conflicts with /assign/:caseId)
router.get('/:id', casesController.getCaseById);

module.exports = router;
