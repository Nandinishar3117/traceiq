const storageService = require('../services/storageService');

class TracesController {
  async getTraces(req, res, next) {
    try {
      const traces = await storageService.getTraces();
      res.json({
        success: true,
        data: {
          total: traces.length,
          traces
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async getTraceById(req, res, next) {
    try {
      const { traceId } = req.params;
      const trace = await storageService.getTraceById(traceId);
      if (!trace) {
        return res.status(404).json({
          success: false,
          error: { message: `Trace '${traceId}' not found` }
        });
      }

      // Build trace spans / timeline visualization
      const timelineSpans = trace.logs.map((log, index) => ({
        span_id: `span_${index}`,
        service: log.service,
        endpoint: log.endpoint || 'Internal Operation',
        http_method: log.http_method || 'OP',
        timestamp: log.timestamp,
        duration_ms: log.duration_ms ? parseFloat(log.duration_ms) : 10.0,
        status: log.status_code || (log.level === 'ERROR' ? 500 : 200),
        level: log.level,
        message: log.message
      }));

      res.json({
        success: true,
        data: {
          trace,
          spans: timelineSpans
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new TracesController();
