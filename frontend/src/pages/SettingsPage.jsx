import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Database, 
  Search, 
  Server, 
  Bot, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  Cpu,
  Info
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import { api } from '../services/api';

export default function SettingsPage() {
  const [statusData, setStatusData] = useState(null);
  const [configData, setConfigData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const [st, cfg] = await Promise.all([
        api.getSystemStatus(),
        api.getSystemConfig()
      ]);
      setStatusData(st);
      setConfigData(cfg);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  if (loading && !statusData) {
    return (
      <div className="loading-box">
        <RefreshCw className="animate-spin" size={28} style={{ color: '#38bdf8' }} />
        <span>Checking service connections...</span>
      </div>
    );
  }

  const { system = {}, connections = {} } = statusData || {};

  return (
    <div className="page-container">
      {/* 1. Header */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={20} style={{ color: 'var(--accent-cyan)' }} />
              <span>Platform Settings & Infrastructure Health</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Real-time health telemetry across Node.js backend, PostgreSQL, Elasticsearch, and FastAPI analytics
            </p>
          </div>

          <button onClick={loadSettings} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} />
            <span>Ping Services</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: '#ef4444' }}>
          <span style={{ color: '#f87171' }}>Failed to retrieve connection statuses: {error}</span>
        </div>
      )}

      {/* 2. Infrastructure Services Connectivity Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        {/* Backend Gateway */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={18} style={{ color: '#38bdf8' }} />
              <span style={{ fontWeight: 600 }}>Node.js API Gateway</span>
            </div>
            <StatusBadge status={connections.backend?.status || 'CONNECTED'} />
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div>Port: <span className="font-mono">{connections.backend?.port || 5000}</span></div>
            <div>Node Version: <span className="font-mono">{system.node_version}</span></div>
            <div>Uptime: <span className="font-mono">{system.uptime_seconds}s</span></div>
            <div>Health: <span style={{ color: '#10b981', fontWeight: 600 }}>OPERATIONAL</span></div>
          </div>
        </div>

        {/* PostgreSQL */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} style={{ color: '#6366f1' }} />
              <span style={{ fontWeight: 600 }}>PostgreSQL</span>
            </div>
            <StatusBadge status={connections.postgresql?.status} />
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div>Host: <span className="font-mono">{connections.postgresql?.details?.host || 'localhost:5432'}</span></div>
            <div>Database: <span className="font-mono">{connections.postgresql?.details?.database || 'traceiq'}</span></div>
            <div>Persistence: <span style={{ color: connections.postgresql?.healthy ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
              {connections.postgresql?.healthy ? 'PostgreSQL Active' : 'Local Storage Fallback'}
            </span></div>
            {connections.postgresql?.details?.error && (
              <div style={{ color: '#f87171', fontSize: '0.72rem' }}>
                Note: {connections.postgresql.details.error}
              </div>
            )}
          </div>
        </div>

        {/* Elasticsearch */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={18} style={{ color: '#f59e0b' }} />
              <span style={{ fontWeight: 600 }}>Elasticsearch</span>
            </div>
            <StatusBadge status={connections.elasticsearch?.status} />
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div>Node: <span className="font-mono">{connections.elasticsearch?.details?.url || 'http://localhost:9200'}</span></div>
            <div>Search Index: <span className="font-mono">{connections.elasticsearch?.details?.index || 'traceiq-logs'}</span></div>
            <div>Query Engine: <span style={{ color: connections.elasticsearch?.healthy ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
              {connections.elasticsearch?.healthy ? 'Elasticsearch Inverted Index' : 'Database Full-Text Search Fallback'}
            </span></div>
            {connections.elasticsearch?.details?.error && (
              <div style={{ color: '#f87171', fontSize: '0.72rem' }}>
                Note: {connections.elasticsearch.details.error}
              </div>
            )}
          </div>
        </div>

        {/* FastAPI Analytics */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={18} style={{ color: '#a855f7' }} />
              <span style={{ fontWeight: 600 }}>FastAPI Analytics</span>
            </div>
            <StatusBadge status={connections.analytics_service?.status} />
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div>URL: <span className="font-mono">{connections.analytics_service?.details?.url || 'http://localhost:8000'}</span></div>
            <div>Anomaly Engine: <span className="font-mono">Z-score + Baseline Model</span></div>
            <div>Heuristics: <span className="font-mono">Modular Rule-based AI</span></div>
            {connections.analytics_service?.details?.error && (
              <div style={{ color: '#f87171', fontSize: '0.72rem' }}>
                Note: {connections.analytics_service.details.error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. System Configuration Parameters */}
      {configData && (
        <div className="card">
          <h4 className="card-title" style={{ marginBottom: '14px' }}>
            <Info size={18} style={{ color: 'var(--accent-cyan)' }} />
            <span>Active Application Configuration</span>
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            <div className="metric-card" style={{ padding: '12px' }}>
              <span className="metric-label">Max Bulk Ingestion Size</span>
              <span className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                {configData.max_bulk_size} records
              </span>
            </div>
            <div className="metric-card" style={{ padding: '12px' }}>
              <span className="metric-label">Max File Upload Limit</span>
              <span className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                {configData.max_file_upload_mb} MB
              </span>
            </div>
            <div className="metric-card" style={{ padding: '12px' }}>
              <span className="metric-label">Supported Log Formats</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {configData.supported_formats.join(', ')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Architecture Reference */}
      <div className="card" style={{ background: 'var(--bg-surface)' }}>
        <h4 className="card-title" style={{ marginBottom: '10px' }}>
          Architecture Responsibilities
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>React Frontend:</strong> Dark developer dashboard, real-time KPI metrics, interactive error grouping, span timeline waterfall, incident triage, and AI debugging console.
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Node.js Express Backend:</strong> REST API gateway, ingestion pipeline validation, fallback storage orchestration, and multi-service health monitoring.
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Python FastAPI Analytics:</strong> Parsing, log fingerprinting, anomaly detection (Z-scores), latency percentiles, and rule-based AI diagnostic reasoning.
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>PostgreSQL & Elasticsearch:</strong> Relational metadata & incident management in PostgreSQL with inverted index full-text search in Elasticsearch.
          </div>
        </div>
      </div>
    </div>
  );
}
