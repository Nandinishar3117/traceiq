require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // PostgreSQL Configuration
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/traceiq',
  PG_HOST: process.env.PG_HOST || 'localhost',
  PG_PORT: parseInt(process.env.PG_PORT || '5432', 10),
  PG_DATABASE: process.env.PG_DATABASE || 'traceiq',
  PG_USER: process.env.PG_USER || 'postgres',
  PG_PASSWORD: process.env.PG_PASSWORD || 'postgres',

  // Elasticsearch Configuration
  ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  ELASTICSEARCH_INDEX: process.env.ELASTICSEARCH_INDEX || 'traceiq-logs',

  // Analytics Service Configuration
  ANALYTICS_SERVICE_URL: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8000',

  // Ingestion settings
  MAX_BULK_SIZE: parseInt(process.env.MAX_BULK_SIZE || '500', 10),
  MAX_FILE_UPLOAD_MB: parseInt(process.env.MAX_FILE_UPLOAD_MB || '10', 10)
};
