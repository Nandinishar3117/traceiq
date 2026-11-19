const ingestionService = require('../services/ingestionService');
const storageService = require('../services/storageService');

class LogsController {
  async ingestSingle(req, res, next) {
    try {
      const result = await ingestionService.ingestSingle(req.body);
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async ingestBulk(req, res, next) {
    try {
      const logsArray = Array.isArray(req.body) ? req.body : req.body.logs;
      if (!logsArray) {
        return res.status(400).json({
          success: false,
          error: { message: 'Body must be an array of logs or an object with "logs" array' }
        });
      }
      const result = await ingestionService.ingestBatch(logsArray);
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async uploadFile(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { message: 'No file uploaded. Expected multipart field "file"' }
        });
      }

      const result = await ingestionService.ingestFileContent(req.file.buffer);
      res.status(201).json({
        success: true,
        file: {
          original_name: req.file.originalname,
          size_bytes: req.file.size
        },
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async getLogs(req, res, next) {
    try {
      const {
        query,
        level,
        service,
        error_type,
        trace_id,
        request_id,
        start_date,
        end_date,
        limit = 50,
        offset = 0
      } = req.query;

      const result = await storageService.getLogs({
        query,
        level,
        service,
        errorType: error_type,
        traceId: trace_id,
        requestId: request_id,
        startDate: start_date,
        endDate: end_date,
        limit: Math.min(parseInt(limit, 10) || 50, 200),
        offset: Math.max(parseInt(offset, 10) || 0, 0)
      });

      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async getLogById(req, res, next) {
    try {
      const { id } = req.params;
      const logs = await storageService.getAllLogsForAnalytics();
      const log = logs.find(l => l.id === id);
      if (!log) {
        return res.status(404).json({
          success: false,
          error: { message: `Log with id '${id}' not found` }
        });
      }
      res.json({
        success: true,
        data: log
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new LogsController();
