const analyticsClient = require('../services/analyticsClient');
const storageService = require('../services/storageService');

class DebuggerController {
  async analyzeError(req, res, next) {
    try {
      const { message, error_type, stack_trace, service, log_id } = req.body;

      if (!message && !log_id) {
        return res.status(400).json({
          success: false,
          error: { message: 'Either "message" or "log_id" is required for analysis' }
        });
      }

      let targetMessage = message;
      let targetErrorType = error_type;
      let targetStackTrace = stack_trace;
      let targetService = service;

      const allLogs = await storageService.getAllLogsForAnalytics();

      if (log_id) {
        const found = allLogs.find(l => l.id === log_id);
        if (found) {
          targetMessage = found.message;
          targetErrorType = found.error_type || targetErrorType;
          targetStackTrace = found.stack_trace || targetStackTrace;
          targetService = found.service || targetService;
        }
      }

      // Fetch AI debugging recommendations from Python analytics engine
      const recommendation = await analyticsClient.getDebugRecommendations({
        message: targetMessage,
        error_type: targetErrorType,
        stack_trace: targetStackTrace,
        service: targetService,
        context_logs: allLogs.slice(0, 10)
      });

      // Find related recurring errors in database
      const errorGroups = await storageService.getErrorGroups();
      const relatedGroups = errorGroups.filter(g => 
        (targetService && g.affected_services.includes(targetService)) ||
        (targetErrorType && g.error_type === targetErrorType)
      ).slice(0, 5);

      res.json({
        success: true,
        data: {
          input: {
            message: targetMessage,
            error_type: targetErrorType,
            service: targetService
          },
          analysis: recommendation,
          related_recurring_errors: relatedGroups
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DebuggerController();
