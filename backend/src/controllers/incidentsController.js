const storageService = require('../services/storageService');
const analyticsClient = require('../services/analyticsClient');

class IncidentsController {
  async getIncidents(req, res, next) {
    try {
      const incidents = await storageService.getIncidents();
      res.json({
        success: true,
        data: {
          total: incidents.length,
          active: incidents.filter(i => i.status !== 'RESOLVED').length,
          incidents
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async getIncidentById(req, res, next) {
    try {
      const { id } = req.params;
      const incidents = await storageService.getIncidents();
      const incident = incidents.find(i => i.id === id);
      if (!incident) {
        return res.status(404).json({
          success: false,
          error: { message: `Incident '${id}' not found` }
        });
      }

      // Fetch related logs
      const allLogs = await storageService.getAllLogsForAnalytics();
      let relatedLogs = [];
      if (incident.related_log_ids && incident.related_log_ids.length > 0) {
        relatedLogs = allLogs.filter(l => incident.related_log_ids.includes(l.id));
      }
      if (relatedLogs.length === 0 && incident.affected_services) {
        relatedLogs = allLogs.filter(l => 
          incident.affected_services.includes(l.service) && (l.level === 'ERROR' || l.level === 'CRITICAL')
        ).slice(0, 20);
      }

      // Build incident timeline events
      const timeline = [
        {
          timestamp: incident.created_at,
          type: 'TRIGGERED',
          message: `Incident opened via ${incident.triggered_by}`
        }
      ];
      if (incident.updated_at && incident.updated_at !== incident.created_at) {
        timeline.push({
          timestamp: incident.updated_at,
          type: 'STATUS_UPDATE',
          message: `Status updated to ${incident.status}`
        });
      }
      if (incident.resolved_at) {
        timeline.push({
          timestamp: incident.resolved_at,
          type: 'RESOLVED',
          message: 'Incident marked as resolved'
        });
      }

      res.json({
        success: true,
        data: {
          incident,
          timeline,
          related_logs: relatedLogs
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async createIncident(req, res, next) {
    try {
      const { title, description, severity, affected_services } = req.body;
      if (!title) {
        return res.status(400).json({
          success: false,
          error: { message: 'Title is required to create an incident' }
        });
      }

      const created = await storageService.createIncident({
        title,
        description: description || `Manually triggered incident: ${title}`,
        severity: severity || 'MEDIUM',
        affected_services: affected_services || [],
        triggered_by: 'manual'
      });

      res.status(201).json({
        success: true,
        data: created
      });
    } catch (err) {
      next(err);
    }
  }

  async updateIncidentStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, root_cause } = req.body;
      if (!status) {
        return res.status(400).json({
          success: false,
          error: { message: 'New status is required' }
        });
      }

      const updated = await storageService.updateIncidentStatus(id, status.toUpperCase(), root_cause);
      if (!updated) {
        return res.status(404).json({
          success: false,
          error: { message: `Incident '${id}' not found` }
        });
      }

      res.json({
        success: true,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  async triggerAutoDetection(req, res, next) {
    try {
      const allLogs = await storageService.getAllLogsForAnalytics();
      const existingIncidents = await storageService.getIncidents();
      const detected = await analyticsClient.evaluateIncidentRules(allLogs, existingIncidents);

      const createdList = [];
      for (const item of detected) {
        const inc = await storageService.createIncident(item);
        createdList.push(inc);
      }

      res.json({
        success: true,
        data: {
          detected_count: detected.length,
          created: createdList
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new IncidentsController();
