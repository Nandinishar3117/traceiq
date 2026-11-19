const express = require('express');
const errorsController = require('../controllers/errorsController');

const router = express.Router();

router.get('/groups', errorsController.getErrorGroups);
router.get('/groups/:id', errorsController.getErrorGroupById);
router.get('/stats', errorsController.getErrorStats);

module.exports = router;
