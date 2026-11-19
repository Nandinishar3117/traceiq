const app = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger');
const postgresService = require('./services/postgresService');
const elasticsearchService = require('./services/elasticsearchService');
const analyticsClient = require('./services/analyticsClient');

async function startServer() {
  logger.info(`Starting TraceIQ Backend Service on port ${config.PORT}...`);

  // Check connections asynchronously
  postgresService.checkConnection().then(status => {
    if (status.connected) {
      logger.info('Connected to PostgreSQL successfully');
      postgresService.initSchema();
    } else {
      logger.warn(`PostgreSQL connection notice: ${status.error || 'Offline'} - using local storage fallback`);
    }
  });

  elasticsearchService.checkConnection().then(status => {
    if (status.connected) {
      logger.info('Connected to Elasticsearch successfully');
      elasticsearchService.ensureIndex();
    } else {
      logger.warn(`Elasticsearch connection notice: ${status.error || 'Offline'} - using database full-text fallback`);
    }
  });

  analyticsClient.checkConnection().then(status => {
    if (status.connected) {
      logger.info('Connected to FastAPI Analytics Service');
    } else {
      logger.warn(`FastAPI Analytics Service offline at ${config.ANALYTICS_SERVICE_URL}`);
    }
  });

  const server = app.listen(config.PORT, () => {
    logger.info(`TraceIQ Backend Gateway running at http://localhost:${config.PORT}`);
    logger.info(`API Health check available at http://localhost:${config.PORT}/api/health`);
  });

  // Graceful shutdown
  const shutdown = () => {
    logger.info('Shutting down server gracefully...');
    server.close(() => {
      logger.info('TraceIQ Backend stopped');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
