const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/claimDraftsController');

router.post('/', ctrl.saveDraft);
router.get('/last', ctrl.getLastDraft);
router.get('/', ctrl.listDrafts);
router.get('/:policy', ctrl.getDraft);
router.delete('/:policy', ctrl.deleteDraft);

module.exports = router;
