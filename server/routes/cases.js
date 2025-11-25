const express = require('express');
const router = express.Router();
const { requireAuth, requireMinRole, ROLES } = require('../middleware/auth');
const casesController = require('../controllers/casesController');
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

// GET all cases
router.get('/', requireAuth, requireMinRole(ROLES.STAFF), casesController.getAllCases);

// POST new case
router.post(
  '/',
  requireAuth,
  requireMinRole(ROLES.STAFF),
  validate([
    body('deceased_name').isString().trim().notEmpty(),
    body('intake_day').optional().isString(),
    body('delivery_date').optional().isString(),
    body('delivery_time').optional().isString()
  ]),
  casesController.createCase
);

// POST assign vehicle to case (creates roster entry)
router.post(
  '/assign/:caseId',
  requireAuth,
  requireMinRole(ROLES.MANAGER),
  validate([
    param('caseId').isInt({ gt: 0 }),
    body('vehicle_id').isInt({ gt: 0 })
  ]),
  casesController.assignVehicle
);

// PATCH update case status
router.patch(
  '/:id/status',
  requireAuth,
  requireMinRole(ROLES.MANAGER),
  validate([
    param('id').isInt({ gt: 0 }),
    body('status').isString().trim().notEmpty()
  ]),
  casesController.updateCaseStatus
);

// PATCH update funeral time (only if status is 'intake')
router.patch(
  '/:id/funeral-time',
  requireAuth,
  requireMinRole(ROLES.STAFF),
  validate([
    param('id').isInt({ gt: 0 }),
    body('funeral_time').isString().trim().notEmpty()
  ]),
  casesController.updateFuneralTime
);

// GET single case by ID (must come last to avoid conflicts with /assign/:caseId)
router.get('/:id', requireAuth, requireMinRole(ROLES.STAFF), casesController.getCaseById);

module.exports = router;
