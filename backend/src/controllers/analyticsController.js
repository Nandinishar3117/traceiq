const storageService = require('../services/storageService');
const analyticsClient = require('../services/analyticsClient');
const sampleDataService = require('../services/sampleDataService');

class AnalyticsController {
  async getAnomalies(req, res, next) {
    try {
      const { bucket_minutes = 5, z_threshold = 2.0 } = req.query;
      const allLogs = await storageService.getAllLogsForAnalytics();

      const result = await analyticsClient.detectAnomalies(
        allLogs,
        parseInt(bucket_minutes, 10),
        parseFloat(z_threshold)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async getDashboardSummary(req, res, next) {
    try {
      const allLogs = await storageService.getAllLogsForAnalytics();
      const incidents = await storageService.getIncidents();
      const errorGroups = await storageService.getErrorGroups();

      const totalLogs = allLogs.length;
      const errorLogs = allLogs.filter(l => l.level === 'ERROR' || l.level === 'CRITICAL');
      const criticalErrors = allLogs.filter(l => l.level === 'CRITICAL').length;
      const activeIncidents = incidents.filter(i => i.status !== 'RESOLVED').length;
      const errorRate = totalLogs > 0 ? Math.round((errorLogs.length / totalLogs) * 1000) / 10 : 0;

      // Calculate avg API response time
      const requestsWithDuration = allLogs.filter(l => l.duration_ms !== null && l.duration_ms !== undefined);
      const avgResponseTime = requestsWithDuration.length > 0 
        ? Math.round((requestsWithDuration.reduce((acc, curr) => acc + parseFloat(curr.duration_ms), 0) / requestsWithDuration.length) * 10) / 10 
        : 0;

      // Recent Errors (last 8)
      const recentErrors = errorLogs.slice(0, 8);

      // Service Health breakdown
      const serviceStats = {};
      for (const log of allLogs) {
        if (!serviceStats[log.service]) {
          serviceStats[log.service] = { total: 0, errors: 0, critical: 0 };
        }
        serviceStats[log.service].total += 1;
        if (log.level === 'ERROR') serviceStats[log.service].errors += 1;
        if (log.level === 'CRITICAL') serviceStats[log.service].critical += 1;
      }

      const servicesHealth = Object.keys(serviceStats).map(name => {
        const s = serviceStats[name];
        const sErrorRate = s.total > 0 ? (s.errors + s.critical) / s.total : 0;
        let health = 'HEALTHY';
        if (s.critical > 0 || sErrorRate > 0.25) health = 'CRITICAL';
        else if (s.errors > 0 || sErrorRate > 0.05) health = 'DEGRADED';

        return {
          service: name,
          total_logs: s.total,
          error_count: s.errors + s.critical,
          health_status: health
        };
      });

      // Error frequency timeline (last 6 buckets)
      const timeBuckets = {};
      for (const log of allLogs) {
        const d = new Date(log.timestamp);
        const key = `${d.getUTCHours().toString().padStart(2, '0')}:${(Math.floor(d.getUTCMinutes() / 10) * 10).toString().padStart(2, '0')}`;
        if (!timeBuckets[key]) {
          timeBuckets[key] = { time: key, total: 0, errors: 0 };
        }
        timeBuckets[key].total += 1;
        if (log.level === 'ERROR' || log.level === 'CRITICAL') {
          timeBuckets[key].errors += 1;
        }
      }
      const frequencyChart = Object.values(timeBuckets).slice(-12);

      // Latest detected anomalies
      const anomalyRes = await analyticsClient.detectAnomalies(allLogs, 5, 1.8);

      res.json({
        success: true,
        data: {
          total_logs: totalLogs,
          total_errors: errorLogs.length,
          critical_errors: criticalErrors,
          active_incidents: activeIncidents,
          error_rate: errorRate,
          avg_response_time_ms: avgResponseTime,
          services_health: servicesHealth,
          error_frequency_chart: frequencyChart,
          recent_errors: recentErrors,
          top_error_groups: errorGroups.slice(0, 5),
          latest_anomalies: (anomalyRes && anomalyRes.anomalies) ? anomalyRes.anomalies.slice(0, 5) : []
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async seedSampleData(req, res, next) {
    try {
      const result = await sampleDataService.seedRealisticSampleData();
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AnalyticsController();
