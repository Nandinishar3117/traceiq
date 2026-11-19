const storageService = require('../services/storageService');
const analyticsClient = require('../services/analyticsClient');

class PerformanceController {
  async getMetrics(req, res, next) {
    try {
      const { slow_threshold_ms = 800 } = req.query;
      const allLogs = await storageService.getAllLogsForAnalytics();
      
      const metrics = await analyticsClient.calculatePerformance(
        allLogs,
        parseFloat(slow_threshold_ms)
      );

      // Latency distribution buckets for charts
      const distribution = [
        { range: '0-100ms', count: 0 },
        { range: '100-300ms', count: 0 },
        { range: '300-800ms', count: 0 },
        { range: '800-2000ms', count: 0 },
        { range: '2000ms+', count: 0 }
      ];

      for (const log of allLogs) {
        if (log.duration_ms !== null && log.duration_ms !== undefined) {
          const d = parseFloat(log.duration_ms);
          if (d < 100) distribution[0].count++;
          else if (d < 300) distribution[1].count++;
          else if (d < 800) distribution[2].count++;
          else if (d < 2000) distribution[3].count++;
          else distribution[4].count++;
        }
      }

      res.json({
        success: true,
        data: {
          ...metrics,
          latency_distribution: distribution
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async getSlowRequests(req, res, next) {
    try {
      const { threshold = 800, limit = 50 } = req.query;
      const allLogs = await storageService.getAllLogsForAnalytics();
      const threshNum = parseFloat(threshold);

      const slowLogs = allLogs
        .filter(l => l.duration_ms && parseFloat(l.duration_ms) >= threshNum)
        .sort((a, b) => parseFloat(b.duration_ms) - parseFloat(a.duration_ms))
        .slice(0, parseInt(limit, 10));

      res.json({
        success: true,
        data: {
          threshold_ms: threshNum,
          total_slow: slowLogs.length,
          logs: slowLogs
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PerformanceController();
