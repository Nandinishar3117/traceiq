import React, { useState, useEffect } from 'react';
import { 
  GitCommit, 
  Search, 
  Clock, 
  Layers, 
  AlertCircle, 
  CheckCircle, 
  ArrowRight,
  Server
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { api } from '../services/api';

export default function DistributedTracesPage() {
  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected trace details & spans waterfall
  const [selectedTrace, setSelectedTrace] = useState(null);
  const [traceSpans, setTraceSpans] = useState([]);
  const [traceLoading, setTraceLoading] = useState(false);

  const loadTraces = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getTraces();
      setTraces(res.traces || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTraces();
  }, []);

  const handleOpenTrace = async (trace) => {
    try {
      setSelectedTrace(trace);
      setTraceLoading(true);
      const res = await api.getTraceById(trace.trace_id);
      setTraceSpans(res.spans || []);
    } catch (err) {
      console.error(err);
    } finally {
      setTraceLoading(false);
    }
  };

  const filteredTraces = traces.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.trace_id.toLowerCase().includes(q) ||
      (t.request_id && t.request_id.toLowerCase().includes(q)) ||
      t.services.some(s => s.toLowerCase().includes(q))
    );
  });

  return (
    <div className="page-container">
      {/* 1. Header & Controls */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GitCommit size={20} style={{ color: 'var(--accent-cyan)' }} />
              <span>Distributed Traces</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Correlate cross-service request lifecycles, service propagation paths, and execution latency
            </p>
          </div>

          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Trace ID or Service..."
              className="input"
              style={{ width: '100%', paddingLeft: '36px' }}
            />
          </div>
        </div>
      </div>

      {/* 2. Traces List */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="loading-box">
            <Clock className="animate-spin" size={26} style={{ color: '#38bdf8' }} />
            <span>Correlating distributed traces...</span>
          </div>
        ) : error ? (
          <div className="empty-box" style={{ color: '#f87171' }}>{error}</div>
        ) : filteredTraces.length === 0 ? (
          <div className="empty-box">
            <span>No distributed traces found. Trace identifiers are populated from ingested logs.</span>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Trace ID</th>
                  <th>Service Path</th>
                  <th>Hops / Logs</th>
                  <th>Total Duration</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTraces.map((t) => (
                  <tr 
                    key={t.trace_id}
                    onClick={() => handleOpenTrace(t)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      {t.trace_id}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {t.services.map((svc, i) => (
                          <React.Fragment key={svc}>
                            <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{svc}</span>
                            {i < t.services.length - 1 && <span style={{ color: 'var(--text-muted)' }}>→</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </td>
                    <td className="font-mono" style={{ fontSize: '0.8rem' }}>
                      {t.log_count} log spans
                    </td>
                    <td className="font-mono" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      {t.duration_ms} ms
                    </td>
                    <td>
                      {t.has_error ? (
                        <span className="badge badge-error">FAULT DETECTED</span>
                      ) : (
                        <span className="badge badge-success">HEALTHY</span>
                      )}
                    </td>
                    <td className="font-mono" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {new Date(t.end_time).toLocaleTimeString()}
                    </td>
                    <td>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenTrace(t); }}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                      >
                        <span>Inspect Waterfall</span>
                        <ArrowRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Distributed Trace Waterfall Modal */}
      {selectedTrace && (
        <Modal
          title={`Trace Waterfall: ${selectedTrace.trace_id}`}
          isOpen={Boolean(selectedTrace)}
          onClose={() => { setSelectedTrace(null); setTraceSpans([]); }}
          footer={<button onClick={() => { setSelectedTrace(null); setTraceSpans([]); }} className="btn btn-secondary btn-sm">Close</button>}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <div className="metric-card" style={{ padding: '10px' }}>
              <span className="metric-label">Total Latency</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 700 }} className="font-mono">{selectedTrace.duration_ms} ms</span>
            </div>
            <div className="metric-card" style={{ padding: '10px' }}>
              <span className="metric-label">Services Visited</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{selectedTrace.services.length}</span>
            </div>
            <div className="metric-card" style={{ padding: '10px' }}>
              <span className="metric-label">Spans Recorded</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 700 }} className="font-mono">{selectedTrace.log_count}</span>
            </div>
            <div className="metric-card" style={{ padding: '10px' }}>
              <span className="metric-label">Execution Outcome</span>
              {selectedTrace.has_error ? (
                <StatusBadge status="ERROR" />
              ) : (
                <StatusBadge status="SUCCESS" />
              )}
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Span Waterfall & Service Timeline
            </h4>

            {traceLoading ? (
              <div className="loading-box" style={{ height: 140 }}>
                <span>Rendering span waterfall...</span>
              </div>
            ) : traceSpans.length === 0 ? (
              <div className="empty-box">No spans recorded</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {traceSpans.map((span, idx) => {
                  const maxDur = Math.max(...traceSpans.map(s => s.duration_ms || 10), 10);
                  const barWidthPct = Math.max(Math.min(Math.round((span.duration_ms / maxDur) * 100), 100), 8);
                  const isError = span.level === 'ERROR' || span.level === 'CRITICAL' || span.status >= 400;

                  return (
                    <div 
                      key={idx}
                      style={{
                        padding: '10px 14px',
                        background: 'var(--bg-base)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{span.service}</span>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{span.http_method} {span.endpoint}</span>
                          {isError && <StatusBadge level={span.level} />}
                        </div>
                        <span className="font-mono" style={{ fontSize: '0.78rem', color: isError ? '#f87171' : 'var(--text-muted)' }}>
                          {span.duration_ms} ms (HTTP {span.status})
                        </span>
                      </div>

                      {/* Visual Span Bar */}
                      <div style={{ height: 6, background: 'var(--bg-surface-card)', borderRadius: 3, overflow: 'hidden', marginBottom: '6px' }}>
                        <div 
                          style={{
                            width: `${barWidthPct}%`,
                            height: '100%',
                            background: isError ? '#ef4444' : 'linear-gradient(90deg, #38bdf8, #6366f1)',
                            borderRadius: 3
                          }}
                        />
                      </div>

                      <div className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {span.message}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
