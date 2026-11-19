import React, { useState, useEffect } from 'react';
import { 
  Gauge, 
  Clock, 
  AlertTriangle, 
  Zap, 
  Layers, 
  TrendingUp,
  Server
} from 'lucide-react';
import MetricCard from '../components/common/MetricCard';
import StatusBadge from '../components/common/StatusBadge';
import { api } from '../services/api';

export default function PerformancePage() {
  const [data, setData] = useState(null);
  const [slowRequests, setSlowRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [slowThreshold, setSlowThreshold] = useState(800);

  const loadPerformance = async () => {
    try {
      setLoading(true);
      setError(null);
      const [perfRes, slowRes] = await Promise.all([
        api.getPerformanceMetrics(slowThreshold),
        api.getSlowRequests(slowThreshold, 20)
      ]);
      setData(perfRes);
      setSlowRequests(slowRes.logs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerformance();
  }, [slowThreshold]);

  if (loading && !data) {
    return (
      <div className="loading-box">
        <Clock className="animate-spin" size={28} style={{ color: '#38bdf8' }} />
        <span>Computing endpoint latency percentiles and performance metrics...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}>
        <h3 style={{ color: '#f87171', marginBottom: 8 }}>Performance Analytics Unavailable</h3>
        <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
      </div>
    );
  }

  const {
    total_requests = 0,
    overall_avg_duration_ms = 0,
    slow_request_count = 0,
    endpoints = [],
    latency_distribution = []
  } = data || {};

  const maxDistCount = Math.max(...latency_distribution.map(d => d.count || 1), 1);

  return (
    <div className="page-container">
      {/* 1. Header & Threshold Selector */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Gauge size={20} style={{ color: 'var(--accent-cyan)' }} />
              <span>API Performance & Latency Intelligence</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Response time percentiles (p50, p90, p99), bottleneck detection, and slow query profiling
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Slow Request Ceiling:</span>
            <select 
              value={slowThreshold} 
              onChange={(e) => setSlowThreshold(parseInt(e.target.value, 10))}
              className="select"
              style={{ padding: '6px 12px', fontSize: '0.82rem' }}
            >
              <option value="500">500 ms</option>
              <option value="800">800 ms (Default)</option>
              <option value="1200">1200 ms</option>
              <option value="2000">2000 ms</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Latency Metrics Grid */}
      <div className="metrics-grid">
        <MetricCard 
          label="Tracked Requests" 
          value={total_requests.toLocaleString()} 
          subtext="With span duration info"
          icon={Layers}
        />
        <MetricCard 
          label="Overall Avg Latency" 
          value={`${overall_avg_duration_ms} ms`} 
          subtext="Mean cluster response time"
          icon={Clock}
        />
        <MetricCard 
          label={`Slow Requests (>${slowThreshold}ms)`} 
          value={slow_request_count} 
          subtext={`${total_requests > 0 ? ((slow_request_count / total_requests) * 100).toFixed(1) : 0}% of traffic`}
          icon={AlertTriangle}
          alert={slow_request_count > 0}
        />
        <MetricCard 
          label="Active Endpoints" 
          value={endpoints.length} 
          subtext="Monitored API routes"
          icon={Server}
        />
      </div>

      {/* 3. Latency Distribution Histogram */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Zap size={18} style={{ color: '#38bdf8' }} />
            <span>Latency Distribution Histogram</span>
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Request counts grouped by response time</span>
        </div>

        <div className="bar-chart-container" style={{ height: '120px' }}>
          {latency_distribution.map((dist, idx) => {
            const heightPct = Math.min(Math.round((dist.count / maxDistCount) * 100), 100);
            const isSlow = idx >= 3;
            return (
              <div key={idx} className="bar-col" title={`${dist.range}: ${dist.count} requests`}>
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <div 
                    className={`bar-fill ${isSlow ? 'error' : ''}`}
                    style={{ height: `${Math.max(heightPct, 8)}%`, maxWidth: '50px' }}
                  />
                </div>
                <span className="bar-label">{dist.range} ({dist.count})</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Endpoint-Level Performance Breakdown */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Endpoint-Level Performance Breakdown</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Aggregated request counts, minimum, average, p50, p90, and error rates per endpoint
          </p>
        </div>

        {endpoints.length === 0 ? (
          <div className="empty-box">No endpoint performance metrics recorded.</div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Method & Route</th>
                  <th>Service</th>
                  <th>Requests</th>
                  <th>Avg Latency</th>
                  <th>p50 (Median)</th>
                  <th>p90</th>
                  <th>p99 / Max</th>
                  <th>Error Rate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((ep, idx) => (
                  <tr key={idx}>
                    <td>
                      <span className="font-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        <span style={{ color: 'var(--accent-cyan)', marginRight: '6px' }}>{ep.http_method}</span>
                        {ep.endpoint}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{ep.service}</td>
                    <td className="font-mono">{ep.request_count}</td>
                    <td className="font-mono" style={{ fontWeight: 700, color: ep.is_slow ? '#f87171' : 'var(--text-primary)' }}>
                      {ep.avg_duration_ms} ms
                    </td>
                    <td className="font-mono">{ep.p50_duration_ms} ms</td>
                    <td className="font-mono" style={{ color: ep.p90_duration_ms > slowThreshold ? '#f87171' : 'inherit' }}>
                      {ep.p90_duration_ms} ms
                    </td>
                    <td className="font-mono">{ep.p99_duration_ms} ms</td>
                    <td className="font-mono">
                      {ep.error_rate > 0 ? (
                        <span style={{ color: '#f87171', fontWeight: 600 }}>{ep.error_rate}%</span>
                      ) : (
                        <span style={{ color: '#10b981' }}>0%</span>
                      )}
                    </td>
                    <td>
                      {ep.is_slow ? (
                        <span className="badge badge-error">BOTTLENECK</span>
                      ) : (
                        <span className="badge badge-success">OPTIMAL</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Slow API Requests Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f87171' }}>Slow API Requests (Exceeding {slowThreshold}ms)</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Individual requests with high duration requiring query optimization or caching
            </p>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Showing top {slowRequests.length} slow traces
          </span>
        </div>

        {slowRequests.length === 0 ? (
          <div className="empty-box" style={{ color: '#10b981' }}>
            <span>No requests exceeded the {slowThreshold}ms threshold.</span>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Service</th>
                  <th>Route / Endpoint</th>
                  <th>Latency</th>
                  <th>Trace ID</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {slowRequests.map((req) => (
                  <tr key={req.id}>
                    <td className="font-mono" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {new Date(req.timestamp).toLocaleTimeString()}
                    </td>
                    <td style={{ fontWeight: 600 }}>{req.service}</td>
                    <td className="font-mono">{req.http_method || 'GET'} {req.endpoint}</td>
                    <td className="font-mono" style={{ fontWeight: 700, color: '#f87171' }}>
                      {req.duration_ms} ms
                    </td>
                    <td className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                      {req.trace_id || '—'}
                    </td>
                    <td>
                      <StatusBadge level={req.level} />
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
