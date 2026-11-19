const express = require('express');
const tracesController = require('../controllers/tracesController');

const router = express.Router();

router.get('/', tracesController.getTraces);
router.get('/:traceId', tracesController.getTraceById);

module.exports = router;
