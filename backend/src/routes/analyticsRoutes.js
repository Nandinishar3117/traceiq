const express = require('express');
const analyticsController = require('../controllers/analyticsController');

const router = express.Router();

router.get('/anomalies', analyticsController.getAnomalies);
router.get('/dashboard-summary', analyticsController.getDashboardSummary);
router.post('/seed-sample-data', analyticsController.seedSampleData);

module.exports = router;
