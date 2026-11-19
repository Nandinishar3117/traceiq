import React, { useState } from 'react';
import Sidebar from './components/common/Sidebar';
import Header from './components/common/Header';
import Modal from './components/common/Modal';
import DashboardPage from './pages/DashboardPage';
import LogExplorerPage from './pages/LogExplorerPage';
import ErrorIntelligencePage from './pages/ErrorIntelligencePage';
import IncidentsPage from './pages/IncidentsPage';
import DistributedTracesPage from './pages/DistributedTracesPage';
import PerformancePage from './pages/PerformancePage';
import AIDebuggerPage from './pages/AIDebuggerPage';
import SettingsPage from './pages/SettingsPage';
import { api } from './services/api';

const TAB_TITLES = {
  dashboard: 'Overview Dashboard',
  explorer: 'Log Explorer & Ingestion',
  errors: 'Error Intelligence & Clustering',
  incidents: 'Incidents & Operational Triage',
  traces: 'Distributed Request Tracing',
  performance: 'Performance & Latency Monitoring',
  debugger: 'AI Debugger & Diagnostic Engine',
  settings: 'Settings & Infrastructure Health'
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [explorerFilterService, setExplorerFilterService] = useState('ALL');
  const [debuggerInitialLog, setDebuggerInitialLog] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Global Quick Ingest Modal
  const [isQuickIngestOpen, setIsQuickIngestOpen] = useState(false);
  const [quickLog, setQuickLog] = useState({
    level: 'ERROR',
    service: 'auth-service',
    message: '',
    endpoint: '/api/v1/auth/verify',
    http_method: 'POST',
    status_code: 500,
    duration_ms: 320
  });

  const handleNavigateToExplorer = (svc = 'ALL') => {
    setExplorerFilterService(svc);
    setActiveTab('explorer');
  };

  const handleNavigateToDebugger = (logData) => {
    setDebuggerInitialLog(logData);
    setActiveTab('debugger');
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleQuickIngestSubmit = async (e) => {
    e.preventDefault();
    if (!quickLog.message.trim()) {
      alert('Log message cannot be empty');
      return;
    }
    try {
      await api.ingestLog(quickLog);
      setIsQuickIngestOpen(false);
      setQuickLog({ ...quickLog, message: '' });
      handleRefresh();
      alert('Log ingested successfully into cluster pipeline');
    } catch (err) {
      alert(`Ingestion failed: ${err.message}`);
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'explorer') setExplorerFilterService('ALL');
          if (tab !== 'debugger') setDebuggerInitialLog(null);
        }} 
      />

      {/* Main View Area */}
      <div className="main-content">
        <Header 
          currentTitle={TAB_TITLES[activeTab] || 'TraceIQ'}
          onRefresh={handleRefresh}
          onOpenIngestModal={() => setIsQuickIngestOpen(true)}
        />

        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'dashboard' && (
            <DashboardPage 
              key={`dash_${refreshTrigger}`}
              onNavigateToDebugger={handleNavigateToDebugger}
              onNavigateToExplorer={handleNavigateToExplorer}
            />
          )}

          {activeTab === 'explorer' && (
            <LogExplorerPage 
              key={`exp_${refreshTrigger}_${explorerFilterService}`}
              initialService={explorerFilterService}
              onNavigateToDebugger={handleNavigateToDebugger}
            />
          )}

          {activeTab === 'errors' && (
            <ErrorIntelligencePage 
              key={`err_${refreshTrigger}`}
              onNavigateToDebugger={handleNavigateToDebugger}
            />
          )}

          {activeTab === 'incidents' && (
            <IncidentsPage key={`inc_${refreshTrigger}`} />
          )}

          {activeTab === 'traces' && (
            <DistributedTracesPage key={`trc_${refreshTrigger}`} />
          )}

          {activeTab === 'performance' && (
            <PerformancePage key={`prf_${refreshTrigger}`} />
          )}

          {activeTab === 'debugger' && (
            <AIDebuggerPage 
              key={`dbg_${refreshTrigger}`}
              initialLog={debuggerInitialLog} 
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage key={`set_${refreshTrigger}`} />
          )}
        </main>
      </div>

      {/* Global Quick Ingest Modal */}
      <Modal
        title="Ingest Live Application Log Entry"
        isOpen={isQuickIngestOpen}
        onClose={() => setIsQuickIngestOpen(false)}
        footer={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setIsQuickIngestOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
            <button onClick={handleQuickIngestSubmit} className="btn btn-primary btn-sm">Submit Ingestion</button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Target Microservice</label>
              <select 
                value={quickLog.service} 
                onChange={(e) => setQuickLog({ ...quickLog, service: e.target.value })} 
                className="select" 
                style={{ width: '100%' }}
              >
                <option value="auth-service">auth-service</option>
                <option value="order-service">order-service</option>
                <option value="payment-gateway">payment-gateway</option>
                <option value="inventory-api">inventory-api</option>
                <option value="user-db-cluster">user-db-cluster</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Severity Level</label>
              <select 
                value={quickLog.level} 
                onChange={(e) => setQuickLog({ ...quickLog, level: e.target.value })} 
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
              value={quickLog.message} 
              onChange={(e) => setQuickLog({ ...quickLog, message: e.target.value })} 
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
                value={quickLog.endpoint} 
                onChange={(e) => setQuickLog({ ...quickLog, endpoint: e.target.value })} 
                className="input" 
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Status Code</label>
              <input 
                type="number" 
                value={quickLog.status_code} 
                onChange={(e) => setQuickLog({ ...quickLog, status_code: parseInt(e.target.value) || 200 })} 
                className="input" 
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Duration (ms)</label>
              <input 
                type="number" 
                value={quickLog.duration_ms} 
                onChange={(e) => setQuickLog({ ...quickLog, duration_ms: parseFloat(e.target.value) || 0 })} 
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
