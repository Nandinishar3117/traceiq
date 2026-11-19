const { Pool } = require('pg');
const config = require('../config/env');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class PostgresService {
  constructor() {
    this.pool = new Pool({
      host: config.PG_HOST,
      port: config.PG_PORT,
      database: config.PG_DATABASE,
      user: config.PG_USER,
      password: config.PG_PASSWORD,
      connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 10000,
      max: 20
    });

    this.isConnected = false;
    this.lastError = null;

    this.pool.on('error', (err) => {
      logger.warn(`Unexpected PostgreSQL client error: ${err.message}`);
      this.isConnected = false;
      this.lastError = err.message;
    });
  }

  async checkConnection() {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      this.isConnected = true;
      this.lastError = null;
      return { connected: true, host: `${config.PG_HOST}:${config.PG_PORT}`, database: config.PG_DATABASE };
    } catch (err) {
      this.isConnected = false;
      this.lastError = err.message;
      return { connected: false, error: err.message, host: `${config.PG_HOST}:${config.PG_PORT}`, database: config.PG_DATABASE };
    }
  }

  async initSchema() {
    if (!this.isConnected) return false;
    try {
      const schemaPath = path.resolve(__dirname, '../../../database/postgres/schema.sql');
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf8');
        await this.pool.query(sql);
        logger.info('PostgreSQL schema initialized successfully');
        return true;
      }
    } catch (err) {
      logger.error('Failed to initialize PostgreSQL schema', { error: err.message });
    }
    return false;
  }

  async query(text, params) {
    if (!this.isConnected) {
      throw new Error(`PostgreSQL not connected: ${this.lastError || 'Service offline'}`);
    }
    return this.pool.query(text, params);
  }
}

module.exports = new PostgresService();
