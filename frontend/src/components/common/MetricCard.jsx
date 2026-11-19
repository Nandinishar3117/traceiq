import React from 'react';

export default function MetricCard({ label, value, subtext, icon: Icon, alert = false }) {
  return (
    <div className="metric-card" style={alert ? { borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.05)' } : {}}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="metric-label">{label}</span>
        {Icon && <Icon size={18} style={{ color: alert ? '#f87171' : 'var(--text-muted)' }} />}
      </div>
      <div className="metric-value" style={alert ? { color: '#f87171' } : {}}>
        {value}
      </div>
      {subtext && <div className="metric-sub">{subtext}</div>}
    </div>
  );
}
