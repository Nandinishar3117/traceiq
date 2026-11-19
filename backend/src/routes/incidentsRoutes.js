const express = require('express');
const incidentsController = require('../controllers/incidentsController');

const router = express.Router();

router.get('/', incidentsController.getIncidents);
router.post('/', incidentsController.createIncident);
router.get('/:id', incidentsController.getIncidentById);
router.patch('/:id/status', incidentsController.updateIncidentStatus);
router.post('/auto-detect', incidentsController.triggerAutoDetection);

module.exports = router;
