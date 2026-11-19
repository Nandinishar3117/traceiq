const storageService = require('../services/storageService');
const analyticsClient = require('../services/analyticsClient');

class ErrorsController {
  async getErrorGroups(req, res, next) {
    try {
      const groups = await storageService.getErrorGroups();
      res.json({
        success: true,
        data: {
          total_groups: groups.length,
          groups
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async getErrorGroupById(req, res, next) {
    try {
      const { id } = req.params;
      const groups = await storageService.getErrorGroups();
      const group = groups.find(g => g.id === id || g.fingerprint === id);
      if (!group) {
        return res.status(404).json({
          success: false,
          error: { message: `Error group '${id}' not found` }
        });
      }

      // Fetch related logs for this error group
      const allLogs = await storageService.getAllLogsForAnalytics();
      const relatedLogs = allLogs.filter(l => 
        l.fingerprint === group.fingerprint || 
        (l.error_type === group.error_type && group.affected_services.includes(l.service))
      ).slice(0, 50);

      res.json({
        success: true,
        data: {
          group,
          related_logs: relatedLogs
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async getErrorStats(req, res, next) {
    try {
      const allLogs = await storageService.getAllLogsForAnalytics();
      const errorLogs = allLogs.filter(l => l.level === 'ERROR' || l.level === 'CRITICAL');
      
      const bySeverity = {
        CRITICAL: allLogs.filter(l => l.level === 'CRITICAL').length,
        ERROR: allLogs.filter(l => l.level === 'ERROR').length,
        WARNING: allLogs.filter(l => l.level === 'WARNING').length,
        INFO: allLogs.filter(l => l.level === 'INFO').length,
        DEBUG: allLogs.filter(l => l.level === 'DEBUG').length
      };

      const byService = {};
      for (const log of errorLogs) {
        byService[log.service] = (byService[log.service] || 0) + 1;
      }

      // Time trends (grouped by hour or 10-minute buckets)
      const trendMap = {};
      for (const log of allLogs) {
        const d = new Date(log.timestamp);
        const bucket = `${d.getUTCHours().toString().padStart(2, '0')}:${(Math.floor(d.getUTCMinutes() / 15) * 15).toString().padStart(2, '0')}`;
        if (!trendMap[bucket]) {
          trendMap[bucket] = { time: bucket, total: 0, errors: 0 };
        }
        trendMap[bucket].total += 1;
        if (log.level === 'ERROR' || log.level === 'CRITICAL') {
          trendMap[bucket].errors += 1;
        }
      }

      const timeline = Object.values(trendMap);

      res.json({
        success: true,
        data: {
          total_logs: allLogs.length,
          total_errors: errorLogs.length,
          critical_errors: bySeverity.CRITICAL,
          error_rate: allLogs.length > 0 ? Math.round((errorLogs.length / allLogs.length) * 1000) / 10 : 0,
          by_severity: bySeverity,
          by_service: byService,
          timeline
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ErrorsController();
