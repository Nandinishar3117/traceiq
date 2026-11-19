import React, { useState } from 'react';
import { Database, PlusCircle, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

export default function Header({ currentTitle, onRefresh, onOpenIngestModal }) {
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    try {
      setSeeding(true);
      await api.seedSampleData();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Seeding failed: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {currentTitle}
        </h2>
        <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>
          LIVE CLUSTER
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button 
          onClick={onRefresh} 
          className="btn btn-secondary btn-sm"
          title="Refresh Data"
        >
          <RefreshCw size={15} />
          <span>Refresh</span>
        </button>

        <button 
          onClick={handleSeed} 
          disabled={seeding}
          className="btn btn-secondary btn-sm"
          title="Seed realistic logs for demonstration"
        >
          <Database size={15} style={{ color: '#38bdf8' }} />
          <span>{seeding ? 'Seeding...' : 'Load Sample Data'}</span>
        </button>

        <button 
          onClick={onOpenIngestModal} 
          className="btn btn-primary btn-sm"
        >
          <PlusCircle size={15} />
          <span>Ingest Log</span>
        </button>
      </div>
    </header>
  );
}
