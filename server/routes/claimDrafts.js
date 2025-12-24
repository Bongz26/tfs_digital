const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/claimDraftsController');
const { requireRole } = require('../middleware/auth');

router.post('/', ctrl.saveDraft);
router.get('/last', ctrl.getLastDraft);
router.get('/history', ctrl.getDraftHistory);
router.get('/', ctrl.listDrafts);
router.get('/:policy', ctrl.getDraft);
router.delete('/:policy', ctrl.deleteDraft);

module.exports = router;
