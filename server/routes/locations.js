// locations.js
const express = require('express');
const router = express.Router();
const locationsController = require('../controllers/locationsController');

router.get('/', locationsController.getAllLocations);

module.exports = router;
