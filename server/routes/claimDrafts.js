const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/claimDraftsController');
const { requireRole } = require('../middleware/auth');

router.post('/', ctrl.saveDraft);
router.get('/last', ctrl.getLastDraft);
router.get('/', ctrl.listDrafts);
router.get('/:policy', ctrl.getDraft);
router.delete('/:policy', requireRole(['admin','manager']), ctrl.deleteDraft);

module.exports = router;
