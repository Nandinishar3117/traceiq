const postgresService = require('../services/postgresService');
const elasticsearchService = require('../services/elasticsearchService');
const analyticsClient = require('../services/analyticsClient');
const config = require('../config/env');

class SettingsController {
  async getStatus(req, res, next) {
    try {
      const [pgStatus, esStatus, analyticsStatus] = await Promise.all([
        postgresService.checkConnection(),
        elasticsearchService.checkConnection(),
        analyticsClient.checkConnection()
      ]);

      res.json({
        success: true,
        data: {
          system: {
            service: 'TraceIQ Backend Gateway',
            version: '1.0.0',
            node_version: process.version,
            uptime_seconds: Math.floor(process.uptime()),
            memory_usage: process.memoryUsage(),
            environment: config.NODE_ENV,
            status: 'OPERATIONAL'
          },
          connections: {
            backend: {
              status: 'CONNECTED',
              port: config.PORT,
              healthy: true
            },
            postgresql: {
              status: pgStatus.connected ? 'CONNECTED' : 'DISCONNECTED',
              healthy: pgStatus.connected,
              details: pgStatus
            },
            elasticsearch: {
              status: esStatus.connected ? 'CONNECTED' : 'DISCONNECTED',
              healthy: esStatus.connected,
              details: esStatus
            },
            analytics_service: {
              status: analyticsStatus.connected ? 'CONNECTED' : 'DISCONNECTED',
              healthy: analyticsStatus.connected,
              details: analyticsStatus
            }
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }

  getConfig(req, res) {
    res.json({
      success: true,
      data: {
        server_port: config.PORT,
        max_bulk_size: config.MAX_BULK_SIZE,
        max_file_upload_mb: config.MAX_FILE_UPLOAD_MB,
        elasticsearch_index: config.ELASTICSEARCH_INDEX,
        analytics_url: config.ANALYTICS_SERVICE_URL,
        log_levels: ['INFO', 'DEBUG', 'WARNING', 'ERROR', 'CRITICAL'],
        supported_formats: ['JSON', 'NDJSON', 'Apache Combined', 'Standard Syslog']
      }
    });
  }
}

module.exports = new SettingsController();
