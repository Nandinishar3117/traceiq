import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  Server, 
  Zap, 
  Radio, 
  CheckCircle2, 
  Flame,
  ArrowRight
} from 'lucide-react';
import MetricCard from '../components/common/MetricCard';
import StatusBadge from '../components/common/StatusBadge';
import { api } from '../services/api';

export default function DashboardPage({ onNavigateToDebugger, onNavigateToExplorer }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDashboardSummary();
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="loading-box">
        <Activity className="animate-spin" size={32} style={{ color: '#38bdf8' }} />
        <span>Loading live cluster intelligence...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
        <h3 style={{ color: '#f87171', marginBottom: 8 }}>Unable to load dashboard metrics</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 16 }}>{error}</p>
        <button onClick={loadDashboard} className="btn btn-primary btn-sm">Try Again</button>
      </div>
    );
  }

  const {
    total_logs = 0,
    total_errors = 0,
    critical_errors = 0,
    active_incidents = 0,
    error_rate = 0,
    avg_response_time_ms = 0,
    services_health = [],
    error_frequency_chart = [],
    recent_errors = [],
    latest_anomalies = []
  } = data || {};

  // Calculate highest volume in chart for proportional height
  const maxChartVal = Math.max(
    ...error_frequency_chart.map(b => b.total || 1),
    1
  );

  return (
    <div className="page-container">
      {/* 1. Core KPIs */}
      <div className="metrics-grid">
        <MetricCard 
          label="Total Logs Ingested" 
          value={total_logs.toLocaleString()} 
          subtext="Processed via pipeline"
          icon={Activity}
        />
        <MetricCard 
          label="Total Errors" 
          value={total_errors.toLocaleString()} 
          subtext={`${error_rate}% aggregate error rate`}
          icon={AlertTriangle}
          alert={total_errors > 0}
        />
        <MetricCard 
          label="Critical Errors" 
          value={critical_errors.toLocaleString()} 
          subtext="Requires immediate triage"
          icon={Flame}
          alert={critical_errors > 0}
        />
        <MetricCard 
          label="Active Incidents" 
          value={active_incidents} 
          subtext="Unresolved critical events"
          icon={ShieldAlert}
          alert={active_incidents > 0}
        />
        <MetricCard 
          label="Avg API Latency" 
          value={`${avg_response_time_ms} ms`} 
          subtext="Calculated from request spans"
          icon={Clock}
        />
      </div>

      {/* 2. Error Frequency Timeline Chart & Microservice Health */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Zap size={18} style={{ color: '#38bdf8' }} />
              <span>Log Volume & Error Frequency Timeline</span>
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>10-min time buckets</span>
          </div>

          {error_frequency_chart.length === 0 ? (
            <div className="empty-box" style={{ height: 160 }}>
              <span>No telemetry data collected yet. Click "Load Sample Data" above to view active trends.</span>
            </div>
          ) : (
            <div>
              <div className="bar-chart-container">
                {error_frequency_chart.map((bucket, idx) => {
                  const totalHeightPct = Math.min(Math.round((bucket.total / maxChartVal) * 100), 100);
                  const errorHeightPct = bucket.total > 0 ? Math.min(Math.round((bucket.errors / maxChartVal) * 100), 100) : 0;

                  return (
                    <div key={idx} className="bar-col" title={`Time: ${bucket.time}\nTotal: ${bucket.total}\nErrors: ${bucket.errors}`}>
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
                        <div className="bar-fill" style={{ height: `${Math.max(totalHeightPct, 6)}%` }} />
                        {bucket.errors > 0 && (
                          <div className="bar-fill error" style={{ height: `${Math.max(errorHeightPct, 6)}%` }} />
                        )}
                      </div>
                      <span className="bar-label">{bucket.time}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#38bdf8' }} />
                  <span>Total Ingested</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: '#f87171' }} />
                  <span>Errors / Failures</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Microservice Health Panel */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Server size={18} style={{ color: '#10b981' }} />
              <span>Service Health</span>
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {services_health.length === 0 ? (
              <div className="empty-box"><span>No active microservices registered</span></div>
            ) : (
              services_health.map((svc) => (
                <div 
                  key={svc.service} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {svc.service}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {svc.total_logs} logs ({svc.error_count} errors)
                    </span>
                  </div>
                  <StatusBadge status={svc.health_status} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 3. Latest Detected Anomalies */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Radio size={18} style={{ color: '#f59e0b' }} />
            <span>Latest Detected Statistical Anomalies</span>
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Z-score frequency deviation</span>
        </div>

        {latest_anomalies.length === 0 ? (
          <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981', fontSize: '0.85rem' }}>
            <CheckCircle2 size={18} />
            <span>No anomalous error surges detected. Log frequencies are within normal statistical baseline.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {latest_anomalies.map((anom, idx) => (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <AlertTriangle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fef3c7' }}>
                      {anom.description}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Window: {new Date(anom.bucket_timestamp).toLocaleTimeString()} | Z-Score: {anom.z_score}σ | Expected: {anom.expected_count}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => onNavigateToExplorer && onNavigateToExplorer(anom.service)}
                  className="btn btn-secondary btn-sm"
                >
                  <span>Explore Logs</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Recent Errors Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Flame size={18} style={{ color: '#f87171' }} />
            <span>Recent Application Errors</span>
          </h3>
          <button 
            onClick={() => onNavigateToExplorer && onNavigateToExplorer()}
            className="btn btn-secondary btn-sm"
          >
            View All in Explorer
          </button>
        </div>

        {recent_errors.length === 0 ? (
          <div className="empty-box">
            <span>No recent application errors recorded. Cluster is healthy.</span>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Level</th>
                  <th>Service</th>
                  <th>Message</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recent_errors.map((log) => (
                  <tr key={log.id}>
                    <td className="font-mono" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td>
                      <StatusBadge level={log.level} />
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.service}</td>
                    <td style={{ maxWidth: '450px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.message}
                    </td>
                    <td>
                      <button
                        onClick={() => onNavigateToDebugger && onNavigateToDebugger(log)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.72rem' }}
                      >
                        AI Debug
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
