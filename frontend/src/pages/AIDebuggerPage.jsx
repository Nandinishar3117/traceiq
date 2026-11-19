import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle, 
  Lightbulb, 
  ShieldCheck, 
  Copy, 
  Clock, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import { api } from '../services/api';

const PRESET_SCENARIOS = [
  {
    title: 'DB Pool Exhaustion',
    message: 'FATAL: sorry, too many clients already connected to database. Connection pool limit of 100 reached.',
    error_type: 'DatabaseConnectionError',
    service: 'auth-service'
  },
  {
    title: 'Deadlock Detected',
    message: 'DatabaseDeadlock: deadlock detected while updating inventory reservation for SKU-4091. Process 8910 waits for ExclusiveLock',
    error_type: 'DatabaseDeadlock',
    service: 'order-service'
  },
  {
    title: 'Stripe 504 Timeout',
    message: 'PaymentGatewayTimeout: Stripe API unreachable after 3000ms socket timeout',
    error_type: 'NetworkTimeoutError',
    service: 'payment-gateway'
  },
  {
    title: 'JWT Token Expiration',
    message: 'AuthenticationError: JWT token signature expired for bearer token auth header (exp: 1732000000)',
    error_type: 'AuthenticationError',
    service: 'auth-service'
  },
  {
    title: 'Null Pointer Error',
    message: 'TypeError: Cannot read properties of undefined (reading "shipping_address")',
    error_type: 'NullReferenceError',
    service: 'order-service'
  }
];

export default function AIDebuggerPage({ initialLog }) {
  const [message, setMessage] = useState('');
  const [errorType, setErrorType] = useState('');
  const [service, setService] = useState('auth-service');
  const [stackTrace, setStackTrace] = useState('');

  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Load initialLog if provided via navigation from explorer or dashboard
  useEffect(() => {
    if (initialLog) {
      setMessage(initialLog.message || '');
      setErrorType(initialLog.error_type || '');
      setService(initialLog.service || 'auth-service');
      setStackTrace(initialLog.stack_trace || '');
      runAnalysis({
        message: initialLog.message,
        error_type: initialLog.error_type,
        service: initialLog.service,
        stack_trace: initialLog.stack_trace
      });
    }
  }, [initialLog]);

  const runAnalysis = async (customPayload = null) => {
    const targetPayload = customPayload || {
      message: message.trim(),
      error_type: errorType.trim() || undefined,
      service: service.trim() || undefined,
      stack_trace: stackTrace.trim() || undefined
    };

    if (!targetPayload.message) {
      alert('Please enter an error message or select a preset scenario');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.analyzeDebug(targetPayload);
      setAnalysisResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (preset) => {
    setMessage(preset.message);
    setErrorType(preset.error_type);
    setService(preset.service);
    setStackTrace('');
    runAnalysis({
      message: preset.message,
      error_type: preset.error_type,
      service: preset.service
    });
  };

  const handleCopyCommand = (cmd, index) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const analysis = analysisResult ? analysisResult.analysis : null;
  const relatedErrors = analysisResult ? analysisResult.related_recurring_errors : [];

  return (
    <div className="page-container">
      {/* 1. Header Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)', borderColor: 'rgba(56, 189, 248, 0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', color: '#f8fafc' }}>
              <Bot size={24} style={{ color: '#38bdf8' }} />
              <span>AI Debugger & Root Cause Diagnostic Engine</span>
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Transparent, deterministic root cause inference powered by Python FastAPI analytics. Explains error signatures, isolates failure mechanisms, and generates remediation runbooks.
            </p>
          </div>
        </div>

        {/* Quick Scenario Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>PRESET SCENARIOS:</span>
          {PRESET_SCENARIOS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleApplyPreset(p)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            >
              <Sparkles size={12} style={{ color: '#38bdf8' }} />
              <span>{p.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Interactive Input Panel */}
      <div className="card">
        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '14px' }}>
          Error Telemetry Input
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Error Message / Log Line *
              </label>
              <textarea 
                rows={2} 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Paste unhandled exception or log message here..."
                className="input"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Origin Service
              </label>
              <input 
                type="text" 
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="e.g. auth-service"
                className="input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Stack Trace (Optional)
            </label>
            <textarea 
              rows={2} 
              value={stackTrace}
              onChange={(e) => setStackTrace(e.target.value)}
              placeholder="Optional stack trace frames..."
              className="input font-mono"
              style={{ width: '100%', fontSize: '0.78rem' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button 
              onClick={() => runAnalysis()}
              disabled={loading || !message.trim()}
              className="btn btn-primary"
            >
              <Bot size={16} />
              <span>{loading ? 'Analyzing Root Cause...' : 'Diagnose Root Cause'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Diagnostic Report Output */}
      {error && (
        <div className="card" style={{ borderColor: '#ef4444' }}>
          <span style={{ color: '#f87171' }}>Diagnostic evaluation failed: {error}</span>
        </div>
      )}

      {analysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Summary Banner */}
          <div className="card" style={{ borderLeft: '4px solid #38bdf8' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <StatusBadge level={analysis.severity} />
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  {analysis.error_type}
                </span>
              </div>
              <span className="badge badge-info font-mono" style={{ fontSize: '0.75rem' }}>
                Confidence: {(analysis.confidence_score * 100).toFixed(0)}%
              </span>
            </div>
            <p style={{ fontSize: '0.92rem', color: '#e2e8f0', lineHeight: 1.5 }}>
              {analysis.explanation}
            </p>
          </div>

          {/* Probable Root Causes */}
          <div className="card">
            <h4 className="card-title" style={{ marginBottom: '12px' }}>
              <Lightbulb size={18} style={{ color: '#f59e0b' }} />
              <span>Probable Root Causes & Likelihood</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {analysis.probable_root_causes.map((rc, idx) => (
                <div 
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'var(--bg-base)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{rc.cause}</span>
                  <span className="badge badge-warning font-mono" style={{ fontSize: '0.75rem' }}>{rc.likelihood} likelihood</span>
                </div>
              ))}
            </div>
          </div>

          {/* Remediation Steps & Runbook */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="card">
              <h4 className="card-title" style={{ marginBottom: '12px' }}>
                <CheckCircle2 size={18} style={{ color: '#10b981' }} />
                <span>Immediate Remediation Runbook</span>
              </h4>
              <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                {analysis.suggested_steps.map((step, idx) => (
                  <li key={idx} style={{ lineHeight: 1.4 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Step {idx + 1}:</strong> {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="card">
              <h4 className="card-title" style={{ marginBottom: '12px' }}>
                <ShieldCheck size={18} style={{ color: 'var(--accent-cyan)' }} />
                <span>Prevention & Architectural Hardening</span>
              </h4>
              <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                {analysis.prevention_tips.map((tip, idx) => (
                  <li key={idx} style={{ lineHeight: 1.4 }}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actionable Diagnostic CLI Commands */}
          {analysis.diagnostic_commands && analysis.diagnostic_commands.length > 0 && (
            <div className="card">
              <h4 className="card-title" style={{ marginBottom: '12px' }}>
                <Terminal size={18} style={{ color: '#a855f7' }} />
                <span>Executable Diagnostic Commands</span>
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {analysis.diagnostic_commands.map((cmd, idx) => (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px'
                    }}
                  >
                    <code className="font-mono" style={{ fontSize: '0.8rem', color: '#38bdf8' }}>{cmd}</code>
                    <button 
                      onClick={() => handleCopyCommand(cmd, idx)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                    >
                      <Copy size={12} />
                      <span>{copiedIndex === idx ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Recurring Cluster Errors */}
          {relatedErrors.length > 0 && (
            <div className="card">
              <h4 className="card-title" style={{ marginBottom: '12px' }}>
                <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
                <span>Correlated Recurring Errors in Cluster</span>
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {relatedErrors.map(g => (
                  <div 
                    key={g.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'var(--bg-base)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <StatusBadge level={g.severity} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{g.error_type}</span>
                      <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{g.message_template.substring(0, 70)}...</span>
                    </div>
                    <span className="font-mono" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                      {g.total_occurrences} occurrences
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
