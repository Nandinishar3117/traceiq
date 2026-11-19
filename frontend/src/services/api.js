const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = options.headers || {};

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = (data.error && data.error.message) || data.message || `HTTP error ${res.status}`;
    throw new Error(errorMsg);
  }

  return data.data !== undefined ? data.data : data;
}

export const api = {
  // Dashboard & Analytics
  getDashboardSummary: () => request('/analytics/dashboard-summary'),
  getAnomalies: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/analytics/anomalies?${query}`);
  },
  seedSampleData: () => request('/analytics/seed-sample-data', { method: 'POST' }),

  // Logs
  getLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/logs?${query}`);
  },
  getLogById: (id) => request(`/logs/${id}`),
  ingestLog: (logData) => request('/logs/ingest', {
    method: 'POST',
    body: JSON.stringify(logData)
  }),
  uploadLogFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/logs/upload', {
      method: 'POST',
      body: formData
    });
  },

  // Error Intelligence
  getErrorGroups: () => request('/errors/groups'),
  getErrorGroupById: (id) => request(`/errors/groups/${id}`),
  getErrorStats: () => request('/errors/stats'),

  // Incidents
  getIncidents: () => request('/incidents'),
  getIncidentById: (id) => request(`/incidents/${id}`),
  createIncident: (incidentData) => request('/incidents', {
    method: 'POST',
    body: JSON.stringify(incidentData)
  }),
  updateIncidentStatus: (id, status, rootCause = null) => request(`/incidents/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, root_cause: rootCause })
  }),
  autoDetectIncidents: () => request('/incidents/auto-detect', { method: 'POST' }),

  // Traces
  getTraces: () => request('/traces'),
  getTraceById: (traceId) => request(`/traces/${traceId}`),

  // Performance
  getPerformanceMetrics: (slowThreshold = 800) => request(`/performance/metrics?slow_threshold_ms=${slowThreshold}`),
  getSlowRequests: (threshold = 800, limit = 50) => request(`/performance/slow-requests?threshold=${threshold}&limit=${limit}`),

  // AI Debugger
  analyzeDebug: (debugPayload) => request('/debugger/analyze', {
    method: 'POST',
    body: JSON.stringify(debugPayload)
  }),

  // Settings
  getSystemStatus: () => request('/settings/status'),
  getSystemConfig: () => request('/settings/config')
};
