const fs = require('fs');
const path = require('path');
const postgresService = require('./postgresService');
const elasticsearchService = require('./elasticsearchService');
const logger = require('../utils/logger');

class StorageService {
  constructor() {
    this.dataDir = path.resolve(__dirname, '../../data');
    this.storeFile = path.join(this.dataDir, 'store.json');
    this.localState = {
      logs: [],
      error_groups: {},
      incidents: [],
      performance_metrics: []
    };
    this.initLocalStorage();
  }

  initLocalStorage() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      if (fs.existsSync(this.storeFile)) {
        const content = fs.readFileSync(this.storeFile, 'utf8');
        this.localState = JSON.parse(content);
        if (!this.localState.logs) this.localState.logs = [];
        if (!this.localState.error_groups) this.localState.error_groups = {};
        if (!this.localState.incidents) this.localState.incidents = [];
        if (!this.localState.performance_metrics) this.localState.performance_metrics = [];
      }
    } catch (err) {
      logger.warn(`Could not read local store file: ${err.message}`);
    }
  }

  persistLocalStorage() {
    try {
      // Keep max 5000 logs in local fallback to prevent uncontrolled file growth
      if (this.localState.logs.length > 5000) {
        this.localState.logs = this.localState.logs.slice(-5000);
      }
      fs.writeFileSync(this.storeFile, JSON.stringify(this.localState, null, 2), 'utf8');
    } catch (err) {
      logger.debug(`Could not write local store file: ${err.message}`);
    }
  }

  // --- LOGS ---
  async saveLogs(parsedLogs) {
    if (!parsedLogs || parsedLogs.length === 0) return [];

    // 1. Try PostgreSQL insertion if connected
    if (postgresService.isConnected) {
      try {
        const client = await postgresService.pool.connect();
        try {
          await client.query('BEGIN');
          for (const log of parsedLogs) {
            await client.query(
              `INSERT INTO logs 
              (id, timestamp, level, service, message, error_type, stack_trace, trace_id, request_id, http_method, endpoint, status_code, duration_ms, error_group_id, metadata)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
              ON CONFLICT (id) DO NOTHING`,
              [
                log.id,
                log.timestamp,
                log.level,
                log.service,
                log.message,
                log.error_type || null,
                log.stack_trace || null,
                log.trace_id || null,
                log.request_id || null,
                log.http_method || null,
                log.endpoint || null,
                log.status_code || null,
                log.duration_ms || null,
                log.error_group_id || null,
                JSON.stringify(log.metadata || {})
              ]
            );
          }
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      } catch (err) {
        logger.warn(`PostgreSQL bulk insert failed, fallback to local state: ${err.message}`);
      }
    }

    // Always update local store
    for (const log of parsedLogs) {
      const existingIdx = this.localState.logs.findIndex(l => l.id === log.id);
      if (existingIdx >= 0) {
        this.localState.logs[existingIdx] = log;
      } else {
        this.localState.logs.push(log);
      }
    }
    this.persistLocalStorage();

    // 2. Index into Elasticsearch if connected
    if (elasticsearchService.isConnected) {
      try {
        await elasticsearchService.bulkIndexLogs(parsedLogs);
      } catch (err) {
        logger.debug(`Elasticsearch background indexing notice: ${err.message}`);
      }
    }

    return parsedLogs;
  }

  async getLogs({ query, level, service, errorType, traceId, requestId, startDate, endDate, limit = 50, offset = 0 }) {
    // 1. If Elasticsearch is connected and searching text, use Elasticsearch
    if (elasticsearchService.isConnected && (query || level || service || startDate || endDate)) {
      try {
        return await elasticsearchService.searchLogs({ query, level, service, startDate, endDate, limit, offset });
      } catch (err) {
        logger.debug(`Elasticsearch search failed, falling back to database/local: ${err.message}`);
      }
    }

    // 2. If PostgreSQL is connected, use SQL
    if (postgresService.isConnected) {
      try {
        const conditions = [];
        const params = [];
        let idx = 1;

        if (query) {
          conditions.push(`(message ILIKE $${idx} OR error_type ILIKE $${idx} OR service ILIKE $${idx} OR trace_id ILIKE $${idx})`);
          params.push(`%${query}%`);
          idx++;
        }
        if (level && level !== 'ALL') {
          conditions.push(`level = $${idx}`);
          params.push(level.toUpperCase());
          idx++;
        }
        if (service && service !== 'ALL') {
          conditions.push(`service = $${idx}`);
          params.push(service);
          idx++;
        }
        if (errorType && errorType !== 'ALL') {
          conditions.push(`error_type = $${idx}`);
          params.push(errorType);
          idx++;
        }
        if (traceId) {
          conditions.push(`trace_id = $${idx}`);
          params.push(traceId);
          idx++;
        }
        if (requestId) {
          conditions.push(`request_id = $${idx}`);
          params.push(requestId);
          idx++;
        }
        if (startDate) {
          conditions.push(`timestamp >= $${idx}`);
          params.push(startDate);
          idx++;
        }
        if (endDate) {
          conditions.push(`timestamp <= $${idx}`);
          params.push(endDate);
          idx++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const countQuery = `SELECT COUNT(*) FROM logs ${whereClause}`;
        const countRes = await postgresService.query(countQuery, params);
        const total = parseInt(countRes.rows[0].count, 10);

        const dataQuery = `SELECT * FROM logs ${whereClause} ORDER BY timestamp DESC LIMIT $${idx} OFFSET $${idx + 1}`;
        params.push(limit, offset);
        const dataRes = await postgresService.query(dataQuery, params);

        return {
          total,
          limit,
          offset,
          logs: dataRes.rows,
          source: 'postgresql'
        };
      } catch (err) {
        logger.debug(`PostgreSQL getLogs failed, fallback to local: ${err.message}`);
      }
    }

    // 3. Fallback: local store search & filter
    let filtered = [...this.localState.logs];

    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(l => 
        (l.message && l.message.toLowerCase().includes(q)) ||
        (l.service && l.service.toLowerCase().includes(q)) ||
        (l.error_type && l.error_type.toLowerCase().includes(q)) ||
        (l.trace_id && l.trace_id.toLowerCase().includes(q)) ||
        (l.request_id && l.request_id.toLowerCase().includes(q))
      );
    }
    if (level && level !== 'ALL') {
      filtered = filtered.filter(l => l.level === level.toUpperCase());
    }
    if (service && service !== 'ALL') {
      filtered = filtered.filter(l => l.service === service);
    }
    if (errorType && errorType !== 'ALL') {
      filtered = filtered.filter(l => l.error_type === errorType);
    }
    if (traceId) {
      filtered = filtered.filter(l => l.trace_id === traceId);
    }
    if (requestId) {
      filtered = filtered.filter(l => l.request_id === requestId);
    }
    if (startDate) {
      filtered = filtered.filter(l => new Date(l.timestamp) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter(l => new Date(l.timestamp) <= new Date(endDate));
    }

    // Sort descending by timestamp
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      total,
      limit,
      offset,
      logs: paginated,
      source: 'local_storage'
    };
  }

  async getAllLogsForAnalytics() {
    if (postgresService.isConnected) {
      try {
        const res = await postgresService.query('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 2000');
        if (res.rows && res.rows.length > 0) return res.rows;
      } catch (err) {
        logger.debug(`PostgreSQL getAllLogs failed: ${err.message}`);
      }
    }
    return this.localState.logs;
  }

  // --- ERROR GROUPS ---
  async syncErrorGroups(groups) {
    if (!groups || groups.length === 0) return [];

    if (postgresService.isConnected) {
      try {
        for (const g of groups) {
          await postgresService.query(
            `INSERT INTO error_groups 
            (id, fingerprint, error_type, message_template, first_seen, last_seen, total_occurrences, severity, affected_services, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (fingerprint) DO UPDATE SET 
              total_occurrences = error_groups.total_occurrences + EXCLUDED.total_occurrences,
              last_seen = EXCLUDED.last_seen,
              severity = EXCLUDED.severity,
              affected_services = EXCLUDED.affected_services,
              updated_at = CURRENT_TIMESTAMP`,
            [
              g.id,
              g.fingerprint,
              g.error_type,
              g.message_template,
              g.first_seen,
              g.last_seen,
              g.total_occurrences,
              g.severity,
              JSON.stringify(g.affected_services),
              'unresolved'
            ]
          );
        }
      } catch (err) {
        logger.debug(`PostgreSQL syncErrorGroups notice: ${err.message}`);
      }
    }

    // Local state sync
    for (const g of groups) {
      if (!this.localState.error_groups[g.fingerprint]) {
        this.localState.error_groups[g.fingerprint] = { ...g, status: 'unresolved' };
      } else {
        const existing = this.localState.error_groups[g.fingerprint];
        existing.total_occurrences += g.total_occurrences;
        existing.last_seen = g.last_seen;
        existing.affected_services = Array.from(new Set([...existing.affected_services, ...g.affected_services]));
        if (g.severity === 'CRITICAL') existing.severity = 'CRITICAL';
      }
    }
    this.persistLocalStorage();

    return Object.values(this.localState.error_groups);
  }

  async getErrorGroups() {
    if (postgresService.isConnected) {
      try {
        const res = await postgresService.query('SELECT * FROM error_groups ORDER BY total_occurrences DESC');
        if (res.rows && res.rows.length > 0) return res.rows;
      } catch (err) {
        logger.debug(`PostgreSQL getErrorGroups fallback: ${err.message}`);
      }
    }
    const list = Object.values(this.localState.error_groups);
    list.sort((a, b) => b.total_occurrences - a.total_occurrences);
    return list;
  }

  // --- INCIDENTS ---
  async createIncident(incidentData) {
    const id = incidentData.id || `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const incident = {
      id,
      title: incidentData.title,
      description: incidentData.description,
      severity: incidentData.severity || 'MEDIUM',
      status: incidentData.status || 'OPEN',
      affected_services: incidentData.affected_services || [],
      triggered_by: incidentData.triggered_by || 'manual',
      root_cause: incidentData.root_cause || incidentData.root_cause_hint || null,
      recommendations: incidentData.suggested_actions || [],
      related_log_ids: incidentData.related_log_ids || [],
      created_at: now,
      updated_at: now,
      resolved_at: null
    };

    if (postgresService.isConnected) {
      try {
        await postgresService.query(
          `INSERT INTO incidents 
          (id, title, description, severity, status, affected_services, triggered_by, root_cause, recommendations, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO NOTHING`,
          [
            incident.id,
            incident.title,
            incident.description,
            incident.severity,
            incident.status,
            JSON.stringify(incident.affected_services),
            incident.triggered_by,
            incident.root_cause,
            JSON.stringify(incident.recommendations),
            incident.created_at,
            incident.updated_at
          ]
        );
      } catch (err) {
        logger.debug(`PostgreSQL createIncident notice: ${err.message}`);
      }
    }

    this.localState.incidents.unshift(incident);
    this.persistLocalStorage();
    return incident;
  }

  async getIncidents() {
    if (postgresService.isConnected) {
      try {
        const res = await postgresService.query('SELECT * FROM incidents ORDER BY created_at DESC');
        if (res.rows && res.rows.length > 0) return res.rows;
      } catch (err) {
        logger.debug(`PostgreSQL getIncidents fallback: ${err.message}`);
      }
    }
    return this.localState.incidents;
  }

  async updateIncidentStatus(id, newStatus, rootCause = null) {
    const now = new Date().toISOString();
    let updatedIncident = null;

    if (postgresService.isConnected) {
      try {
        const resolvedAt = newStatus === 'RESOLVED' ? now : null;
        const res = await postgresService.query(
          `UPDATE incidents 
          SET status = $1, root_cause = COALESCE($2, root_cause), updated_at = $3, resolved_at = COALESCE($4, resolved_at)
          WHERE id = $5 RETURNING *`,
          [newStatus, rootCause, now, resolvedAt, id]
        );
        if (res.rows && res.rows[0]) {
          updatedIncident = res.rows[0];
        }
      } catch (err) {
        logger.debug(`PostgreSQL updateIncidentStatus notice: ${err.message}`);
      }
    }

    const idx = this.localState.incidents.findIndex(i => i.id === id);
    if (idx >= 0) {
      this.localState.incidents[idx].status = newStatus;
      this.localState.incidents[idx].updated_at = now;
      if (rootCause) this.localState.incidents[idx].root_cause = rootCause;
      if (newStatus === 'RESOLVED') this.localState.incidents[idx].resolved_at = now;
      updatedIncident = this.localState.incidents[idx];
      this.persistLocalStorage();
    }

    return updatedIncident;
  }

  // --- TRACES ---
  async getTraces() {
    const logs = await this.getAllLogsForAnalytics();
    const tracesMap = {};

    for (const log of logs) {
      if (!log.trace_id) continue;
      const tid = log.trace_id;
      if (!tracesMap[tid]) {
        tracesMap[tid] = {
          trace_id: tid,
          request_id: log.request_id || null,
          services: new Set(),
          log_count: 0,
          error_count: 0,
          total_duration_ms: 0,
          start_time: log.timestamp,
          end_time: log.timestamp,
          logs: []
        };
      }

      const t = tracesMap[tid];
      t.services.add(log.service);
      t.log_count += 1;
      if (log.level === 'ERROR' || log.level === 'CRITICAL' || (log.status_code && log.status_code >= 400)) {
        t.error_count += 1;
      }
      if (log.duration_ms) {
        t.total_duration_ms += parseFloat(log.duration_ms);
      }
      if (new Date(log.timestamp) < new Date(t.start_time)) t.start_time = log.timestamp;
      if (new Date(log.timestamp) > new Date(t.end_time)) t.end_time = log.timestamp;
      t.logs.push(log);
    }

    return Object.values(tracesMap).map(t => ({
      ...t,
      services: Array.from(t.services),
      duration_ms: Math.round(t.total_duration_ms * 10) / 10,
      has_error: t.error_count > 0
    })).sort((a, b) => new Date(b.end_time) - new Date(a.end_time));
  }

  async getTraceById(traceId) {
    const logs = await this.getAllLogsForAnalytics();
    const traceLogs = logs.filter(l => l.trace_id === traceId);
    if (!traceLogs.length) return null;

    traceLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const services = Array.from(new Set(traceLogs.map(l => l.service)));
    const totalDuration = traceLogs.reduce((acc, curr) => acc + (parseFloat(curr.duration_ms) || 0), 0);

    return {
      trace_id: traceId,
      request_id: traceLogs[0].request_id || null,
      services,
      duration_ms: Math.round(totalDuration * 10) / 10,
      start_time: traceLogs[0].timestamp,
      end_time: traceLogs[traceLogs.length - 1].timestamp,
      log_count: traceLogs.length,
      has_error: traceLogs.some(l => l.level === 'ERROR' || l.level === 'CRITICAL'),
      logs: traceLogs
    };
  }
}

module.exports = new StorageService();
