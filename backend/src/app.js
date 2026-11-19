const express = require('express');
const cors = require('cors');
const errorHandler = require('./middlewares/errorHandler');
const logger = require('./utils/logger');

// Route imports
const logsRoutes = require('./routes/logsRoutes');
const errorsRoutes = require('./routes/errorsRoutes');
const incidentsRoutes = require('./routes/incidentsRoutes');
const tracesRoutes = require('./routes/tracesRoutes');
const performanceRoutes = require('./routes/performanceRoutes');
const debuggerRoutes = require('./routes/debuggerRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl !== '/api/health') {
      logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Primary Health Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'traceiq-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/logs', logsRoutes);
app.use('/api/errors', errorsRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/traces', tracesRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/debugger', debuggerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Endpoint ${req.method} ${req.originalUrl} not found`,
      status: 404
    }
  });
});

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
