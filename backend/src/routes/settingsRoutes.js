const express = require('express');
const settingsController = require('../controllers/settingsController');

const router = express.Router();

router.get('/status', settingsController.getStatus);
router.get('/config', settingsController.getConfig);

module.exports = router;
