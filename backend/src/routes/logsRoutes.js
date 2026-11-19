const express = require('express');
const multer = require('multer');
const logsController = require('../controllers/logsController');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

router.post('/ingest', logsController.ingestSingle);
router.post('/bulk', logsController.ingestBulk);
router.post('/upload', upload.single('file'), logsController.uploadFile);
router.get('/', logsController.getLogs);
router.get('/:id', logsController.getLogById);

module.exports = router;
