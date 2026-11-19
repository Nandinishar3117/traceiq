import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Plus, 
  PlayCircle, 
  Clock, 
  CheckCircle, 
  AlertOctagon, 
  Server,
  FileText
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { api } from '../services/api';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Selected incident modal
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [incidentDetail, setIncidentDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Status update modal
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [targetIncident, setTargetIncident] = useState(null);
  const [newStatus, setNewStatus] = useState('INVESTIGATING');
  const [rootCauseNote, setRootCauseNote] = useState('');

  // Create incident modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    severity: 'HIGH',
    services: 'order-service, payment-gateway'
  });

  const loadIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getIncidents();
      setIncidents(res.incidents || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const handleOpenDetail = async (inc) => {
    try {
      setSelectedIncident(inc);
      setDetailLoading(true);
      const res = await api.getIncidentById(inc.id);
      setIncidentDetail(res);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!targetIncident) return;
    try {
      await api.updateIncidentStatus(targetIncident.id, newStatus, rootCauseNote);
      setUpdateModalOpen(false);
      setRootCauseNote('');
      loadIncidents();
      if (selectedIncident && selectedIncident.id === targetIncident.id) {
        handleOpenDetail(targetIncident);
      }
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      alert('Title is required');
      return;
    }
    try {
      const affected = createForm.services.split(',').map(s => s.trim()).filter(Boolean);
      await api.createIncident({
        title: createForm.title,
        description: createForm.description,
        severity: createForm.severity,
        affected_services: affected
      });
      setCreateModalOpen(false);
      setCreateForm({ title: '', description: '', severity: 'HIGH', services: '' });
      loadIncidents();
    } catch (err) {
      alert(`Creation failed: ${err.message}`);
    }
  };

  const handleRunAutoDetection = async () => {
    try {
      const res = await api.autoDetectIncidents();
      alert(`Evaluated rule engine: Opened ${res.detected_count || 0} new incident(s) from active error telemetry.`);
      loadIncidents();
    } catch (err) {
      alert(`Auto-detection failed: ${err.message}`);
    }
  };

  const filteredIncidents = incidents.filter(i => {
    if (filterStatus === 'ALL') return true;
    return i.status === filterStatus;
  });

  return (
    <div className="page-container">
      {/* 1. Header & Actions */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={20} style={{ color: '#f87171' }} />
              <span>Incidents & Operational Triage</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Track, investigate, and resolve critical cluster failures and automated rule breaches
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleRunAutoDetection} className="btn btn-secondary btn-sm" title="Evaluate trigger rules against logs">
              <PlayCircle size={15} style={{ color: 'var(--accent-cyan)' }} />
              <span>Run Auto-Rule Engine</span>
            </button>
            <button onClick={() => setCreateModalOpen(true)} className="btn btn-primary btn-sm">
              <Plus size={15} />
              <span>Create Incident</span>
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
          {['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`btn btn-sm ${filterStatus === st ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.78rem' }}
            >
              {st} ({st === 'ALL' ? incidents.length : incidents.filter(i => i.status === st).length})
            </button>
          ))}
        </div>
      </div>

      {/* 2. Incidents List */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="loading-box">
            <Clock className="animate-spin" size={26} style={{ color: '#38bdf8' }} />
            <span>Loading incidents registry...</span>
          </div>
        ) : error ? (
          <div className="empty-box" style={{ color: '#f87171' }}>{error}</div>
        ) : filteredIncidents.length === 0 ? (
          <div className="empty-box">
            <span>No incidents matching status filter '{filterStatus}'.</span>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Severity</th>
                  <th>Incident Title</th>
                  <th>Trigger Source</th>
                  <th>Affected Services</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.map(inc => (
                  <tr 
                    key={inc.id}
                    onClick={() => handleOpenDetail(inc)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <StatusBadge status={inc.status} />
                    </td>
                    <td>
                      <StatusBadge level={inc.severity} />
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {inc.title}
                    </td>
                    <td className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {inc.triggered_by}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(inc.affected_services || []).map(svc => (
                          <span key={svc} className="badge badge-info" style={{ fontSize: '0.65rem' }}>{svc}</span>
                        ))}
                      </div>
                    </td>
                    <td className="font-mono" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {new Date(inc.created_at).toLocaleString()}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setTargetIncident(inc);
                          setNewStatus(inc.status === 'OPEN' ? 'INVESTIGATING' : 'RESOLVED');
                          setRootCauseNote(inc.root_cause || '');
                          setUpdateModalOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                      >
                        Update Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Incident Details & Timeline Modal */}
      {selectedIncident && (
        <Modal
          title={`Incident: ${selectedIncident.title}`}
          isOpen={Boolean(selectedIncident)}
          onClose={() => { setSelectedIncident(null); setIncidentDetail(null); }}
          footer={
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => {
                  setTargetIncident(selectedIncident);
                  setNewStatus(selectedIncident.status === 'OPEN' ? 'INVESTIGATING' : 'RESOLVED');
                  setRootCauseNote(selectedIncident.root_cause || '');
                  setUpdateModalOpen(true);
                }}
                className="btn btn-primary btn-sm"
              >
                Change Status
              </button>
              <button onClick={() => { setSelectedIncident(null); setIncidentDetail(null); }} className="btn btn-secondary btn-sm">Close</button>
            </div>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <div className="metric-card" style={{ padding: '10px' }}>
              <span className="metric-label">Status</span>
              <StatusBadge status={selectedIncident.status} />
            </div>
            <div className="metric-card" style={{ padding: '10px' }}>
              <span className="metric-label">Severity</span>
              <StatusBadge level={selectedIncident.severity} />
            </div>
            <div className="metric-card" style={{ padding: '10px' }}>
              <span className="metric-label">Trigger</span>
              <span className="font-mono" style={{ fontSize: '0.75rem' }}>{selectedIncident.triggered_by}</span>
            </div>
            <div className="metric-card" style={{ padding: '10px' }}>
              <span className="metric-label">Created At</span>
              <span className="font-mono" style={{ fontSize: '0.75rem' }}>{new Date(selectedIncident.created_at).toLocaleTimeString()}</span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>DESCRIPTION</span>
            <div style={{ marginTop: '6px', padding: '12px', background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.88rem' }}>
              {selectedIncident.description}
            </div>
          </div>

          {selectedIncident.root_cause && (
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f59e0b' }}>DOCUMENTED ROOT CAUSE</span>
              <div style={{ marginTop: '6px', padding: '12px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '6px', fontSize: '0.88rem', color: '#fef3c7' }}>
                {selectedIncident.root_cause}
              </div>
            </div>
          )}

          {/* Timeline Events */}
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
              INCIDENT TIMELINE
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(incidentDetail ? incidentDetail.timeline : []).map((ev, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: 'var(--bg-base)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <Clock size={14} style={{ color: 'var(--accent-cyan)' }} />
                  <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {ev.message}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Related Logs */}
          {incidentDetail && incidentDetail.related_logs && incidentDetail.related_logs.length > 0 && (
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                RELATED ERROR LOGS ({incidentDetail.related_logs.length})
              </span>
              <div className="table-container" style={{ maxHeight: '180px' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Service</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidentDetail.related_logs.map(l => (
                      <tr key={l.id}>
                        <td className="font-mono" style={{ fontSize: '0.72rem' }}>{new Date(l.timestamp).toLocaleTimeString()}</td>
                        <td style={{ fontWeight: 600 }}>{l.service}</td>
                        <td className="font-mono" style={{ fontSize: '0.75rem' }}>{l.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* 4. Update Incident Status Modal */}
      <Modal
        title={`Update Status: ${targetIncident?.title}`}
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setUpdateModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
            <button onClick={handleStatusUpdateSubmit} className="btn btn-primary btn-sm">Save Status</button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Lifecycle Status</label>
            <select 
              value={newStatus} 
              onChange={(e) => setNewStatus(e.target.value)} 
              className="select"
              style={{ width: '100%' }}
            >
              <option value="OPEN">OPEN (Triggered)</option>
              <option value="INVESTIGATING">INVESTIGATING (Engineer Assigned)</option>
              <option value="RESOLVED">RESOLVED (Mitigated & Closed)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Root Cause / Resolution Notes</label>
            <textarea 
              rows={3} 
              value={rootCauseNote} 
              onChange={(e) => setRootCauseNote(e.target.value)} 
              placeholder="e.g. Connection pool exhaustion resolved by scaling max_connections from 100 to 200 in postgresql.conf"
              className="input" 
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </Modal>

      {/* 5. Create Incident Modal */}
      <Modal
        title="Declare New System Incident"
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setCreateModalOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
            <button onClick={handleCreateSubmit} className="btn btn-primary btn-sm">Declare Incident</button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Incident Title</label>
            <input 
              type="text" 
              value={createForm.title} 
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} 
              placeholder="e.g. Authentication Service High Latency and 504 Failures" 
              className="input" 
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Severity</label>
            <select 
              value={createForm.severity} 
              onChange={(e) => setCreateForm({ ...createForm, severity: e.target.value })} 
              className="select" 
              style={{ width: '100%' }}
            >
              <option value="CRITICAL">CRITICAL (System Outage / Data Loss Risk)</option>
              <option value="HIGH">HIGH (Degraded Service Experience)</option>
              <option value="MEDIUM">MEDIUM (Non-blocking Errors)</option>
              <option value="LOW">LOW (Informational Anomaly)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Affected Services (comma separated)</label>
            <input 
              type="text" 
              value={createForm.services} 
              onChange={(e) => setCreateForm({ ...createForm, services: e.target.value })} 
              placeholder="auth-service, payment-gateway" 
              className="input" 
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Description / Observed Impact</label>
            <textarea 
              rows={3} 
              value={createForm.description} 
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} 
              placeholder="Describe symptoms, customer complaints, or monitored anomalies" 
              className="input" 
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
