const axios = require('axios');
const config = require('../config/env');
const logger = require('../utils/logger');

class AnalyticsClient {
  constructor() {
    this.client = axios.create({
      baseURL: config.ANALYTICS_SERVICE_URL,
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });
    this.isConnected = false;
    this.lastError = null;
  }

  async checkConnection() {
    try {
      const res = await this.client.get('/health');
      this.isConnected = res.data && res.data.status === 'healthy';
      this.lastError = null;
      return { connected: true, service: 'traceiq-analytics', url: config.ANALYTICS_SERVICE_URL };
    } catch (err) {
      this.isConnected = false;
      this.lastError = err.message;
      return { connected: false, error: err.message, url: config.ANALYTICS_SERVICE_URL };
    }
  }

  async parseLogs(rawLogs) {
    try {
      const res = await this.client.post('/parse', { logs: rawLogs });
      return res.data;
    } catch (err) {
      logger.warn(`Analytics parse fallback: ${err.message}`);
      // Robust local validation fallback if python service is offline
      const parsedLogs = [];
      const validationErrors = [];

      rawLogs.forEach((item, idx) => {
        if (!item || (typeof item === 'string' && !item.trim())) {
          validationErrors.push({ record_index: idx, error: 'Empty log entry' });
          return;
        }

        if (typeof item === 'object') {
          const msg = item.message || item.msg || item.log || item.error;
          if (!msg) {
            validationErrors.push({ record_index: idx, error: 'Missing required field "message" or "log"' });
            return;
          }
          const service = item.service || item.service_name || item.app || 'app-service';
          const level = (item.level || item.severity || (String(msg).includes('ERROR') ? 'ERROR' : 'INFO')).toUpperCase();
          parsedLogs.push({
            id: item.id || `log_${Date.now()}_${idx}`,
            timestamp: item.timestamp || new Date().toISOString(),
            level,
            service,
            message: String(msg),
            error_type: item.error_type || (level === 'ERROR' ? 'ApplicationError' : null),
            stack_trace: item.stack_trace || null,
            trace_id: item.trace_id || null,
            request_id: item.request_id || null,
            http_method: item.http_method || null,
            endpoint: item.endpoint || null,
            status_code: item.status_code || null,
            duration_ms: item.duration_ms || null,
            fingerprint: `fp_${service}_${level}`,
            metadata: item.metadata || {}
          });
        } else if (typeof item === 'string') {
          const clean = item.trim();
          parsedLogs.push({
            id: `log_${Date.now()}_${idx}`,
            timestamp: new Date().toISOString(),
            level: clean.includes('ERROR') ? 'ERROR' : 'INFO',
            service: 'app-service',
            message: clean,
            error_type: clean.includes('Error') ? 'ApplicationError' : null,
            fingerprint: `fp_text_${clean.length}`,
            metadata: {}
          });
        }
      });

      return {
        total_received: rawLogs.length,
        successful: parsedLogs.length,
        failed: validationErrors.length,
        parsed_logs: parsedLogs,
        validation_errors: validationErrors
      };
    }
  }

  async getRecurringGroups(logs) {
    try {
      const res = await this.client.post('/recurring-groups', { logs });
      return res.data;
    } catch (err) {
      logger.warn(`Analytics recurring-groups fallback: ${err.message}`);
      return { groups: [], total_groups: 0, total_errors_grouped: 0 };
    }
  }

  async detectAnomalies(logs, bucketMinutes = 5, zThreshold = 2.0) {
    try {
      const res = await this.client.post('/anomalies', {
        logs,
        bucket_minutes: bucketMinutes,
        z_threshold: zThreshold
      });
      return res.data;
    } catch (err) {
      logger.warn(`Analytics anomalies fallback: ${err.message}`);
      return { anomalies: [], total_anomalies: 0, baseline_mean: 0, baseline_std: 0 };
    }
  }

  async calculatePerformance(logs, slowThresholdMs = 800.0) {
    try {
      const res = await this.client.post('/performance', {
        logs,
        slow_threshold_ms: slowThresholdMs
      });
      return res.data;
    } catch (err) {
      logger.warn(`Analytics performance fallback: ${err.message}`);
      return { total_requests: 0, overall_avg_duration_ms: 0, slow_request_count: 0, endpoints: [] };
    }
  }

  async getDebugRecommendations(params) {
    try {
      const res = await this.client.post('/debug-recommendations', params);
      return res.data;
    } catch (err) {
      logger.warn(`Analytics debug-recommendations fallback: ${err.message}`);
      return {
        error_type: params.errorType || 'ApplicationError',
        severity: 'ERROR',
        explanation: `Error occurred in ${params.service || 'service'}: ${params.message}`,
        probable_root_causes: [{ cause: 'Service failure or unhandled exception', likelihood: '50%' }],
        suggested_steps: ['Check service logs', 'Verify database connections'],
        prevention_tips: ['Add error handling'],
        diagnostic_commands: ['curl -Iv http://localhost:5000/api/health'],
        confidence_score: 0.5
      };
    }
  }

  async evaluateIncidentRules(logs, existingIncidents = []) {
    try {
      const res = await this.client.post('/incident-rules', {
        logs,
        existing_incidents: existingIncidents
      });
      return res.data.incidents_to_create || [];
    } catch (err) {
      logger.warn(`Analytics incident-rules fallback: ${err.message}`);
      return [];
    }
  }
}

module.exports = new AnalyticsClient();
