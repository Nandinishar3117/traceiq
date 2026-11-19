import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Upload, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Terminal, 
  Clock, 
  FileText,
  Bot
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { api } from '../services/api';

export default function LogExplorerPage({ initialService = 'ALL', onNavigateToDebugger }) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('ALL');
  const [service, setService] = useState(initialService);
  const [page, setPage] = useState(0);
  const limit = 25;

  // Selected log for inspection
  const [selectedLog, setSelectedLog] = useState(null);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Manual Ingest modal state
  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [manualLog, setManualLog] = useState({
    level: 'ERROR',
    service: 'auth-service',
    message: '',
    endpoint: '/api/v1/auth/login',
    http_method: 'POST',
    status_code: 500,
    duration_ms: 250
  });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        limit,
        offset: page * limit
      };
      if (query.trim()) params.query = query.trim();
      if (level !== 'ALL') params.level = level;
      if (service !== 'ALL') params.service = service;

      const res = await api.getLogs(params);
      setLogs(res.logs || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, level, service]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    fetchLogs();
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    try {
      setUploading(true);
      const res = await api.uploadLogFile(uploadFile);
      alert(`File uploaded successfully! Accepted ${res.data.accepted} records, failed ${res.data.failed}.`);
      setIsUploadOpen(false);
      setUploadFile(null);
      fetchLogs();
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleManualIngestSubmit = async (e) => {
    e.preventDefault();
    if (!manualLog.message.trim()) {
      alert('Log message cannot be empty');
      return;
    }
    try {
      await api.ingestLog(manualLog);
      setIsIngestOpen(false);
      setManualLog({ ...manualLog, message: '' });
      fetchLogs();
    } catch (err) {
      alert(`Ingestion failed: ${err.message}`);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="page-container">
      {/* 1. Header Actions & Filter Controls */}
      <div className="card">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '280px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Full-text search logs, messages, error types, trace IDs..."
                className="input"
                style={{ width: '100%', paddingLeft: '36px' }}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Search
            </button>
          </form>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setIsUploadOpen(true)} className="btn btn-secondary btn-sm">
              <Upload size={14} />
              <span>Upload Log File</span>
            </button>
            <button onClick={() => setIsIngestOpen(true)} className="btn btn-primary btn-sm">
              <Plus size={14} />
              <span>Ingest Entry</span>
            </button>
          </div>
        </div>

        {/* Severity & Service Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Severity:</span>
            <select 
              value={level} 
              onChange={(e) => { setLevel(e.target.value); setPage(0); }}
              className="select"
              style={{ padding: '4px 10px', fontSize: '0.8rem' }}
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="ERROR">ERROR</option>
              <option value="WARNING">WARNING</option>
              <option value="INFO">INFO</option>
              <option value="DEBUG">DEBUG</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Service:</span>
            <select 
              value={service} 
              onChange={(e) => { setService(e.target.value); setPage(0); }}
              className="select"
              style={{ padding: '4px 10px', fontSize: '0.8rem' }}
            >
              <option value="ALL">All Services</option>
              <option value="auth-service">auth-service</option>
              <option value="order-service">order-service</option>
              <option value="payment-gateway">payment-gateway</option>
              <option value="inventory-api">inventory-api</option>
              <option value="user-db-cluster">user-db-cluster</option>
            </select>
          </div>

          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Found <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{total.toLocaleString()}</span> matching logs
          </div>
        </div>
      </div>

      {/* 2. Logs Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="loading-box">
            <Clock className="animate-spin" size={24} style={{ color: '#38bdf8' }} />
            <span>Querying log index...</span>
          </div>
        ) : error ? (
          <div className="empty-box" style={{ color: '#f87171' }}>
            <span>Error loading logs: {error}</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-box">
            <span>No logs found matching the filter criteria.</span>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Timestamp</th>
                  <th style={{ width: '90px' }}>Level</th>
                  <th style={{ width: '140px' }}>Service</th>
                  <th>Message</th>
                  <th style={{ width: '120px' }}>Trace ID</th>
                  <th style={{ width: '80px' }}>Latency</th>
                  <th style={{ width: '90px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr 
                    key={log.id} 
                    onClick={() => setSelectedLog(log)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="font-mono" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td>
                      <StatusBadge level={log.level} />
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {log.service}
                    </td>
                    <td style={{ maxWidth: '420px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span className="font-mono" style={{ fontSize: '0.82rem' }}>
                        {log.message}
                      </span>
                    </td>
                    <td className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                      {log.trace_id ? log.trace_id.substring(0, 14) : '—'}
                    </td>
                    <td className="font-mono" style={{ fontSize: '0.75rem' }}>
                      {log.duration_ms ? `${log.duration_ms}ms` : '—'}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {(log.level === 'ERROR' || log.level === 'CRITICAL') && (
                        <button
                          onClick={() => onNavigateToDebugger && onNavigateToDebugger(log)}
                          className="btn btn-secondary btn-sm"
                          title="Analyze in AI Debugger"
                          style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                        >
                          <Bot size={13} style={{ color: '#38bdf8' }} />
                          <span>Debug</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Page {page + 1} of {Math.max(totalPages, 1)} ({total} records)
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn btn-secondary btn-sm"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <button 
              onClick={() => setPage(p => p + 1)}
              disabled={page + 1 >= totalPages}
              className="btn btn-secondary btn-sm"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Log Details Modal */}
      {selectedLog && (
        <Modal
          title={`Log Details: ${selectedLog.id}`}
          isOpen={Boolean(selectedLog)}
          onClose={() => setSelectedLog(null)}
          footer={
            <div style={{ display: 'flex', gap: '8px' }}>
              {(selectedLog.level === 'ERROR' || selectedLog.level === 'CRITICAL') && (
                <button 
                  onClick={() => {
                    const log = selectedLog;
                    setSelectedLog(null);
                    if (onNavigateToDebugger) onNavigateToDebugger(log);
                  }}
                  className="btn btn-primary btn-sm"
                >
                  <Bot size={15} />
                  <span>Send to AI Debugger</span>
                </button>
              )}
              <button onClick={() => setSelectedLog(null)} className="btn btn-secondary btn-sm">Close</button>
            </div>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div className="metric-card" style={{ padding: '10px' }}>
              <span className="metric-label">Severity</span>
              <StatusBadge level={selectedLog.level} />
            </div>
            <div className="metric-card" style={{ padding: '10px' }}>
              <span className="metric-label">Service</span>
              <span style={{ fontWeight: 600 }}>{selectedLog.service}</span>
            </div>
            <div className="metric-card" style={{ padding: '10px' }}>
              <span className="metric-label">Timestamp</span>
              <span className="font-mono" style={{ fontSize: '0.8rem' }}>{selectedLog.timestamp}</span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>MESSAGE</span>
            <div style={{ marginTop: '6px', padding: '12px', background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: '6px' }} className="font-mono">
              {selectedLog.message}
            </div>
          </div>

          {selectedLog.stack_trace && (
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f87171' }}>STACK TRACE</span>
              <pre style={{ marginTop: '6px', padding: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', fontSize: '0.78rem', color: '#fca5a5', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                {selectedLog.stack_trace}
              </pre>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Trace ID:</span>{' '}
              <span className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{selectedLog.trace_id || 'N/A'}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Request ID:</span>{' '}
              <span className="font-mono">{selectedLog.request_id || 'N/A'}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Endpoint:</span>{' '}
              <span className="font-mono">{selectedLog.http_method || ''} {selectedLog.endpoint || 'N/A'}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Duration:</span>{' '}
              <span className="font-mono">{selectedLog.duration_ms ? `${selectedLog.duration_ms} ms` : 'N/A'}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* 4. Upload File Modal */}
      <Modal
        title="Upload Application Log File"
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setIsUploadOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
            <button onClick={handleUploadSubmit} disabled={!uploadFile || uploading} className="btn btn-primary btn-sm">
              {uploading ? 'Processing File...' : 'Start Ingestion'}
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Upload raw application logs (.log, .txt, .json). TraceIQ will automatically parse timestamps, extract log levels, identify services, calculate error fingerprints, and index into Elasticsearch and PostgreSQL.
          </p>
          <div style={{ border: '2px dashed var(--border-accent)', padding: '28px', borderRadius: '8px', textAlign: 'center', background: 'var(--bg-base)' }}>
            <FileText size={36} style={{ color: 'var(--accent-cyan)', margin: '0 auto 12px' }} />
            <input 
              type="file" 
              accept=".log,.txt,.json" 
              onChange={(e) => setUploadFile(e.target.files[0])}
              style={{ display: 'block', margin: '0 auto' }}
            />
            {uploadFile && (
              <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#10b981' }}>
                Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* 5. Ingest Individual Log Modal */}
      <Modal
        title="Ingest Individual Application Log"
        isOpen={isIngestOpen}
        onClose={() => setIsIngestOpen(false)}
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setIsIngestOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
            <button onClick={handleManualIngestSubmit} className="btn btn-primary btn-sm">Submit Ingestion</button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Service Name</label>
              <input 
                type="text" 
                value={manualLog.service} 
                onChange={(e) => setManualLog({ ...manualLog, service: e.target.value })} 
                className="input" 
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Severity Level</label>
              <select 
                value={manualLog.level} 
                onChange={(e) => setManualLog({ ...manualLog, level: e.target.value })} 
                className="select" 
                style={{ width: '100%' }}
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="ERROR">ERROR</option>
                <option value="WARNING">WARNING</option>
                <option value="INFO">INFO</option>
                <option value="DEBUG">DEBUG</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Log Message / Error Text</label>
            <textarea 
              rows={3} 
              value={manualLog.message} 
              onChange={(e) => setManualLog({ ...manualLog, message: e.target.value })} 
              placeholder="e.g. Database connection pool exhausted: sorry, too many clients"
              className="input" 
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>HTTP Endpoint</label>
              <input 
                type="text" 
                value={manualLog.endpoint} 
                onChange={(e) => setManualLog({ ...manualLog, endpoint: e.target.value })} 
                className="input" 
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Status Code</label>
              <input 
                type="number" 
                value={manualLog.status_code} 
                onChange={(e) => setManualLog({ ...manualLog, status_code: parseInt(e.target.value) || 200 })} 
                className="input" 
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Duration (ms)</label>
              <input 
                type="number" 
                value={manualLog.duration_ms} 
                onChange={(e) => setManualLog({ ...manualLog, duration_ms: parseFloat(e.target.value) || 0 })} 
                className="input" 
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
