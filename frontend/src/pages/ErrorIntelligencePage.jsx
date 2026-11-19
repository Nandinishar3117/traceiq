import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Layers, 
  Clock, 
  Bot, 
  ChevronRight,
  TrendingUp,
  Server
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { api } from '../services/api';

export default function ErrorIntelligencePage({ onNavigateToDebugger }) {
  const [groups, setGroups] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [relatedLogs, setRelatedLogs] = useState([]);
  const [groupLoading, setGroupLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [groupsRes, statsRes] = await Promise.all([
        api.getErrorGroups(),
        api.getErrorStats()
      ]);
      setGroups(groupsRes.groups || []);
      setStats(statsRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectGroup = async (group) => {
    try {
      setSelectedGroup(group);
      setGroupLoading(true);
      const res = await api.getErrorGroupById(group.id);
      setRelatedLogs(res.related_logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setGroupLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-box">
        <Clock className="animate-spin" size={28} style={{ color: '#38bdf8' }} />
        <span>Aggregating recurring error fingerprints...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}>
        <h3 style={{ color: '#f87171', marginBottom: 8 }}>Error Intelligence Unavailable</h3>
        <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
      </div>
    );
  }

  const maxOccurrences = Math.max(...groups.map(g => g.total_occurrences || 1), 1);

  return (
    <div className="page-container">
      {/* 1. Header Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="metric-card">
          <span className="metric-label">Recurring Error Groups</span>
          <div className="metric-value">{groups.length}</div>
          <span className="metric-sub">Deduplicated by fingerprint</span>
        </div>
        <div className="metric-card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <span className="metric-label">Critical Error Types</span>
          <div className="metric-value" style={{ color: '#f87171' }}>
            {groups.filter(g => g.severity === 'CRITICAL').length}
          </div>
          <span className="metric-sub">Severe infrastructure impacts</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Total Error Instances</span>
          <div className="metric-value">
            {stats ? stats.total_errors : groups.reduce((acc, g) => acc + g.total_occurrences, 0)}
          </div>
          <span className="metric-sub">Across all microservices</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Affected Services</span>
          <div className="metric-value" style={{ color: 'var(--accent-cyan)' }}>
            {new Set(groups.flatMap(g => g.affected_services || [])).size}
          </div>
          <span className="metric-sub">Microservices recording faults</span>
        </div>
      </div>

      {/* 2. Recurring Groups Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Identified Recurring Error Patterns</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Normalized stack signatures and error message templates clustered by recurrence
            </p>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Sorted by total occurrences
          </span>
        </div>

        {groups.length === 0 ? (
          <div className="empty-box">
            <span>No recurring error patterns registered yet.</span>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Error Classification</th>
                  <th>Template / Normalized Pattern</th>
                  <th>Occurrences</th>
                  <th>Affected Services</th>
                  <th>First Seen</th>
                  <th>Last Seen</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const pct = Math.min(Math.round((group.total_occurrences / maxOccurrences) * 100), 100);
                  return (
                    <tr 
                      key={group.id}
                      onClick={() => handleSelectGroup(group)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <StatusBadge level={group.severity} />
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {group.error_type}
                      </td>
                      <td style={{ maxWidth: '340px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span className="font-mono" style={{ fontSize: '0.8rem' }}>
                          {group.message_template}
                        </span>
                      </td>
                      <td style={{ minWidth: '120px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                            {group.total_occurrences}
                          </span>
                          <div style={{ flex: 1, height: 6, background: 'var(--bg-base)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: group.severity === 'CRITICAL' ? '#f43f5e' : '#f59e0b', borderRadius: 3 }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {(group.affected_services || []).map(svc => (
                            <span key={svc} className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                              {svc}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="font-mono" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {new Date(group.first_seen).toLocaleDateString()}
                      </td>
                      <td className="font-mono" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {new Date(group.last_seen).toLocaleTimeString()}
                      </td>
                      <td>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onNavigateToDebugger) {
                              onNavigateToDebugger({
                                message: group.message_template,
                                error_type: group.error_type,
                                service: (group.affected_services || [])[0]
                              });
                            }
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                        >
                          <Bot size={13} style={{ color: '#38bdf8' }} />
                          <span>AI Root Cause</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Modal Details for Selected Group */}
      {selectedGroup && (
        <Modal
          title={`Recurring Error Group: ${selectedGroup.error_type}`}
          isOpen={Boolean(selectedGroup)}
          onClose={() => setSelectedGroup(null)}
          footer={
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => {
                  const grp = selectedGroup;
                  setSelectedGroup(null);
                  if (onNavigateToDebugger) {
                    onNavigateToDebugger({
                      message: grp.message_template,
                      error_type: grp.error_type,
                      service: (grp.affected_services || [])[0]
                    });
                  }
                }}
                className="btn btn-primary btn-sm"
              >
                <Bot size={15} />
                <span>Run AI Debugger Diagnostics</span>
              </button>
              <button onClick={() => setSelectedGroup(null)} className="btn btn-secondary btn-sm">Close</button>
            </div>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <div className="metric-card" style={{ padding: '10px' }}>
              <span className="metric-label">Severity</span>
              <StatusBadge level={selectedGroup.severity} />
            </div>
            <div className="metric-card" style={{ padding: '10px' }}>
              <span className="metric-label">Total Occurrences</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 700 }} className="font-mono">{selectedGroup.total_occurrences}</span>
            </div>
            <div className="metric-card" style={{ padding: '10px' }}>
              <span className="metric-label">First Occurrence</span>
              <span className="font-mono" style={{ fontSize: '0.75rem' }}>{new Date(selectedGroup.first_seen).toLocaleString()}</span>
            </div>
            <div className="metric-card" style={{ padding: '10px' }}>
              <span className="metric-label">Last Occurrence</span>
              <span className="font-mono" style={{ fontSize: '0.75rem' }}>{new Date(selectedGroup.last_seen).toLocaleString()}</span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>NORMALIZED ERROR PATTERN</span>
            <div style={{ marginTop: '6px', padding: '12px', background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: '6px' }} className="font-mono">
              {selectedGroup.message_template}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>FINGERPRINT HASH</span>
            <div className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', marginTop: '4px' }}>
              {selectedGroup.fingerprint}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
              ASSOCIATED LOG OCCURRENCES ({relatedLogs.length})
            </span>
            <div className="table-container" style={{ maxHeight: '200px' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Service</th>
                    <th>Message</th>
                    <th>Trace</th>
                  </tr>
                </thead>
                <tbody>
                  {relatedLogs.map(l => (
                    <tr key={l.id}>
                      <td className="font-mono" style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                        {new Date(l.timestamp).toLocaleTimeString()}
                      </td>
                      <td style={{ fontWeight: 600 }}>{l.service}</td>
                      <td className="font-mono" style={{ fontSize: '0.75rem' }}>{l.message}</td>
                      <td className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>{l.trace_id || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
