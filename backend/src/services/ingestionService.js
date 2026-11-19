const analyticsClient = require('./analyticsClient');
const storageService = require('./storageService');
const logger = require('../utils/logger');

class IngestionService {
  async ingestSingle(rawLog) {
    return this.ingestBatch([rawLog]);
  }

  async ingestBatch(rawLogs) {
    if (!Array.isArray(rawLogs) || rawLogs.length === 0) {
      return {
        total_received: 0,
        accepted: 0,
        failed: 0,
        validation_errors: [{ error: 'Payload must be a non-empty array of log records' }],
        logs: []
      };
    }

    // 1. Send to analytics engine for parsing, validation and classification
    const parseResult = await analyticsClient.parseLogs(rawLogs);
    const validLogs = parseResult.parsed_logs || [];

    if (validLogs.length === 0) {
      return {
        total_received: parseResult.total_received,
        accepted: 0,
        failed: parseResult.failed,
        validation_errors: parseResult.validation_errors,
        logs: []
      };
    }

    // 2. Persist to storage (PostgreSQL + Local Store) & Elasticsearch
    await storageService.saveLogs(validLogs);

    // 3. Update error recurring groups in the background
    try {
      const errorLogs = validLogs.filter(l => l.level === 'ERROR' || l.level === 'CRITICAL');
      if (errorLogs.length > 0) {
        const groupsRes = await analyticsClient.getRecurringGroups(errorLogs);
        if (groupsRes && groupsRes.groups && groupsRes.groups.length > 0) {
          await storageService.syncErrorGroups(groupsRes.groups);
        }

        // 4. Evaluate automated incident rules
        const existingIncidents = await storageService.getIncidents();
        const incidentsToCreate = await analyticsClient.evaluateIncidentRules(validLogs, existingIncidents);
        for (const inc of incidentsToCreate) {
          await storageService.createIncident(inc);
          logger.info(`Automated Incident Triggered: ${inc.title} (${inc.severity})`);
        }
      }
    } catch (bgErr) {
      logger.warn(`Post-ingestion analytics background task notice: ${bgErr.message}`);
    }

    return {
      total_received: parseResult.total_received,
      accepted: validLogs.length,
      failed: parseResult.failed,
      validation_errors: parseResult.validation_errors,
      logs: validLogs
    };
  }

  async ingestFileContent(fileContent) {
    let rawItems = [];
    const text = fileContent.toString('utf8').trim();

    // Check if entire file is a JSON array
    if (text.startsWith('[') && text.endsWith(']')) {
      try {
        rawItems = JSON.parse(text);
      } catch (e) {
        // Fall back to line by line
        rawItems = text.split('\n').map(l => l.trim()).filter(Boolean);
      }
    } else {
      // Split line by line (either NDJSON or text logs)
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (line.startsWith('{') && line.endsWith('}')) {
          try {
            rawItems.push(JSON.parse(line));
          } catch (e) {
            rawItems.push(line);
          }
        } else {
          rawItems.push(line);
        }
      }
    }

    return this.ingestBatch(rawItems);
  }
}

module.exports = new IngestionService();
