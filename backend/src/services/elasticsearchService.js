const { Client } = require('@elastic/elasticsearch');
const config = require('../config/env');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class ElasticsearchService {
  constructor() {
    this.client = new Client({
      node: config.ELASTICSEARCH_URL,
      requestTimeout: 4000,
      maxRetries: 2
    });
    this.indexName = config.ELASTICSEARCH_INDEX;
    this.isConnected = false;
    this.lastError = null;
  }

  async checkConnection() {
    try {
      const ping = await this.client.ping();
      this.isConnected = ping;
      this.lastError = null;
      return { connected: true, url: config.ELASTICSEARCH_URL, index: this.indexName };
    } catch (err) {
      this.isConnected = false;
      this.lastError = err.message;
      return { connected: false, error: err.message, url: config.ELASTICSEARCH_URL, index: this.indexName };
    }
  }

  async ensureIndex() {
    if (!this.isConnected) return false;
    try {
      const exists = await this.client.indices.exists({ index: this.indexName });
      if (!exists) {
        const mappingsPath = path.resolve(__dirname, '../../../database/elasticsearch/mappings.json');
        let indexBody = {};
        if (fs.existsSync(mappingsPath)) {
          indexBody = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
        }
        await this.client.indices.create({
          index: this.indexName,
          body: indexBody
        });
        logger.info(`Elasticsearch index '${this.indexName}' created successfully`);
      }
      return true;
    } catch (err) {
      logger.warn(`Elasticsearch index creation note: ${err.message}`);
      return false;
    }
  }

  async indexLog(log) {
    if (!this.isConnected) return false;
    try {
      await this.client.index({
        index: this.indexName,
        id: log.id,
        document: {
          id: log.id,
          timestamp: log.timestamp,
          level: log.level,
          service: log.service,
          message: log.message,
          error_type: log.error_type || null,
          stack_trace: log.stack_trace || null,
          trace_id: log.trace_id || null,
          request_id: log.request_id || null,
          http_method: log.http_method || null,
          endpoint: log.endpoint || null,
          status_code: log.status_code || null,
          duration_ms: log.duration_ms || null,
          error_group_id: log.error_group_id || null,
          metadata: log.metadata || {}
        }
      });
      return true;
    } catch (err) {
      logger.debug(`Elasticsearch indexLog failed: ${err.message}`);
      return false;
    }
  }

  async bulkIndexLogs(logs) {
    if (!this.isConnected || !logs || logs.length === 0) return false;
    try {
      const operations = logs.flatMap(log => [
        { index: { _index: this.indexName, _id: log.id } },
        {
          id: log.id,
          timestamp: log.timestamp,
          level: log.level,
          service: log.service,
          message: log.message,
          error_type: log.error_type || null,
          stack_trace: log.stack_trace || null,
          trace_id: log.trace_id || null,
          request_id: log.request_id || null,
          http_method: log.http_method || null,
          endpoint: log.endpoint || null,
          status_code: log.status_code || null,
          duration_ms: log.duration_ms || null,
          error_group_id: log.error_group_id || null,
          metadata: log.metadata || {}
        }
      ]);

      const bulkResponse = await this.client.bulk({ refresh: true, operations });
      if (bulkResponse.errors) {
        logger.warn('Elasticsearch bulk indexing had partial errors');
      }
      return true;
    } catch (err) {
      logger.debug(`Elasticsearch bulkIndex failed: ${err.message}`);
      return false;
    }
  }

  async searchLogs({ query, level, service, startDate, endDate, limit = 50, offset = 0 }) {
    if (!this.isConnected) {
      throw new Error(`Elasticsearch not connected: ${this.lastError || 'Service offline'}`);
    }

    const must = [];
    if (query && query.trim()) {
      must.push({
        multi_match: {
          query: query.trim(),
          fields: ['message^3', 'error_type^2', 'service', 'trace_id', 'request_id', 'stack_trace']
        }
      });
    }

    const filter = [];
    if (level && level !== 'ALL') {
      filter.push({ term: { level: level.toUpperCase() } });
    }
    if (service && service !== 'ALL') {
      filter.push({ term: { service: service } });
    }
    if (startDate || endDate) {
      const range = {};
      if (startDate) range.gte = startDate;
      if (endDate) range.lte = endDate;
      filter.push({ range: { timestamp: range } });
    }

    const body = {
      query: {
        bool: {
          must: must.length > 0 ? must : [{ match_all: {} }],
          filter: filter
        }
      },
      sort: [{ timestamp: { order: 'desc' } }],
      from: offset,
      size: limit
    };

    const response = await this.client.search({
      index: this.indexName,
      body: body
    });

    const hits = response.hits.hits.map(h => h._source);
    const total = typeof response.hits.total === 'number' ? response.hits.total : response.hits.total.value;

    return {
      total,
      limit,
      offset,
      logs: hits,
      source: 'elasticsearch'
    };
  }
}

module.exports = new ElasticsearchService();
