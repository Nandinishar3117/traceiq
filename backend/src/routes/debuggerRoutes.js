const express = require('express');
const debuggerController = require('../controllers/debuggerController');

const router = express.Router();

router.post('/analyze', debuggerController.analyzeError);

module.exports = router;
