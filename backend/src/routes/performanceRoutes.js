const express = require('express');
const performanceController = require('../controllers/performanceController');

const router = express.Router();

router.get('/metrics', performanceController.getMetrics);
router.get('/slow-requests', performanceController.getSlowRequests);

module.exports = router;
