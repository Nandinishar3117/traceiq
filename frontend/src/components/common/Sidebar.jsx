import React from 'react';
import { 
  Activity, 
  Search, 
  AlertTriangle, 
  ShieldAlert, 
  GitCommit, 
  Gauge, 
  Bot, 
  Settings,
  Terminal
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'explorer', label: 'Log Explorer', icon: Search },
  { id: 'errors', label: 'Error Intelligence', icon: AlertTriangle },
  { id: 'incidents', label: 'Incidents', icon: ShieldAlert },
  { id: 'traces', label: 'Distributed Traces', icon: GitCommit },
  { id: 'performance', label: 'Performance', icon: Gauge },
  { id: 'debugger', label: 'AI Debugger', icon: Bot },
  { id: 'settings', label: 'Settings', icon: Settings }
];

export default function Sidebar({ activeTab, onSelectTab }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Terminal size={24} style={{ color: '#38bdf8' }} />
          <span>TraceIQ</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`nav-item ${isActive ? 'active' : ''}`}
              style={{ width: '100%', textAlign: 'left' }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>TraceIQ Platform</span>
          <span>v1.0.0 Production</span>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} title="System Operational" />
      </div>
    </aside>
  );
}
