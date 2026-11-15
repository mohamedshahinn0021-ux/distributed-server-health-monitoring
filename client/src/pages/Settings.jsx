import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  PlayCircle,
  ShieldCheck,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import {
  setMockSimulator,
  getMockSimulatorState,
  fetchSystemHealth,
} from '../services/api.js';

export default function Settings({ showToast, onRefreshData }) {
  const [systemHealth, setSystemHealth] = useState(null);
  const [simulatorState, setSimulatorState] = useState({
    dynamicStatus: 200,
    dynamicDelay: 80,
    dynamicError: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    try {
      const health = await fetchSystemHealth();
      setSystemHealth(health);
      const sim = await getMockSimulatorState();
      setSimulatorState(sim);
    } catch (err) {
      console.error('Failed to load settings data:', err);
    }
  };

  const handleApplyPreset = async (preset) => {
    setLoading(true);
    let payload = {};
    if (preset === 'fast') {
      payload = { status: 200, delay: 70, error: false };
    } else if (preset === 'slow') {
      payload = { status: 200, delay: 900, error: false };
    } else if (preset === 'error') {
      payload = { status: 503, delay: 40, error: true };
    } else if (preset === 'recovering') {
      payload = { status: 200, delay: 90, error: false };
    }

    try {
      const res = await setMockSimulator(payload);
      setSimulatorState(res.currentState);
      showToast(`Simulator preset "${preset.toUpperCase()}" applied! Check Live Monitoring or FSM page.`, 'success');
      if (onRefreshData) onRefreshData();
    } catch (err) {
      showToast('Failed to apply simulator preset: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSimulatorSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await setMockSimulator(simulatorState);
      setSimulatorState(res.currentState);
      showToast('Custom mock simulator settings updated!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* 1. Assessment Interactive Simulator Panel */}
      <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #38bdf8' }}>
        <div className="card-header">
          <h2 className="card-title">
            <PlayCircle size={18} style={{ color: '#38bdf8' }} />
            Assessment Safe FSM Test Simulator
          </h2>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            College project safe testing harness
          </span>
        </div>

        <p style={{ fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '1rem' }}>
          This simulator controls the built-in test server endpoint (<code>/api/mock/dynamic</code>).
          Click any preset button below to immediately simulate normal operation, latency degradation,
          outages, or recovery without disrupting external infrastructure!
        </p>

        {/* Quick Simulator Preset Buttons */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1.25rem',
          }}
        >
          <button
            onClick={() => handleApplyPreset('fast')}
            disabled={loading}
            className="btn btn-secondary"
            style={{
              padding: '0.75rem',
              justifyContent: 'flex-start',
              borderLeft: '3px solid #22c55e',
            }}
          >
            <CheckCircle2 size={16} style={{ color: '#22c55e' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>Normal (ACTIVE)</div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>200 OK • 70ms latency</div>
            </div>
          </button>

          <button
            onClick={() => handleApplyPreset('slow')}
            disabled={loading}
            className="btn btn-secondary"
            style={{
              padding: '0.75rem',
              justifyContent: 'flex-start',
              borderLeft: '3px solid #eab308',
            }}
          >
            <AlertTriangle size={16} style={{ color: '#eab308' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>Latency Spike (SLOW)</div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>200 OK • 900ms latency</div>
            </div>
          </button>

          <button
            onClick={() => handleApplyPreset('error')}
            disabled={loading}
            className="btn btn-secondary"
            style={{
              padding: '0.75rem',
              justifyContent: 'flex-start',
              borderLeft: '3px solid #ef4444',
            }}
          >
            <XCircle size={16} style={{ color: '#ef4444' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>Outage (DISCONNECTED)</div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>503 Error • 2x failures</div>
            </div>
          </button>

          <button
            onClick={() => handleApplyPreset('recovering')}
            disabled={loading}
            className="btn btn-secondary"
            style={{
              padding: '0.75rem',
              justifyContent: 'flex-start',
              borderLeft: '3px solid #3b82f6',
            }}
          >
            <RefreshCw size={16} style={{ color: '#3b82f6' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>Restore (RECOVERING)</div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>200 OK • 2x verification</div>
            </div>
          </button>
        </div>

        {/* Custom Configuration Form */}
        <form onSubmit={handleCustomSimulatorSave}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              backgroundColor: '#0f172a',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid #1e293b',
            }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">HTTP Status Code</label>
              <input
                type="number"
                value={simulatorState.dynamicStatus}
                onChange={(e) =>
                  setSimulatorState({
                    ...simulatorState,
                    dynamicStatus: Number(e.target.value),
                  })
                }
                className="form-input font-mono"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Artificial Delay (ms)</label>
              <input
                type="number"
                min={0}
                max={10000}
                value={simulatorState.dynamicDelay}
                onChange={(e) =>
                  setSimulatorState({
                    ...simulatorState,
                    dynamicDelay: Number(e.target.value),
                  })
                }
                className="form-input font-mono"
              />
            </div>

            <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <label className="form-label">Simulate Outage Flag</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={simulatorState.dynamicError}
                    onChange={(e) =>
                      setSimulatorState({
                        ...simulatorState,
                        dynamicError: e.target.checked,
                      })
                    }
                  />
                  <span className="slider"></span>
                </label>
                <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                  {simulatorState.dynamicError ? 'Returning 5xx error' : 'Returning healthy response'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
                Apply Custom Settings
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 2. System Architecture & Environment Info */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Runtime Diagnostics */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Server size={18} style={{ color: '#38bdf8' }} />
              System Runtime Diagnostics
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid #1e293b' }}>
              <span style={{ color: '#94a3b8' }}>Application Name:</span>
              <span style={{ fontWeight: 600 }}>Distributed Health Monitor</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid #1e293b' }}>
              <span style={{ color: '#94a3b8' }}>Backend Version:</span>
              <span className="font-mono">{systemHealth?.version || '1.0.0'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid #1e293b' }}>
              <span style={{ color: '#94a3b8' }}>Database Engine:</span>
              <span style={{ color: '#22c55e', fontWeight: 600 }}>
                {systemHealth?.database === 'connected' ? 'MongoDB (Connected)' : 'MongoDB / In-Memory Driver'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid #1e293b' }}>
              <span style={{ color: '#94a3b8' }}>Process Uptime:</span>
              <span className="font-mono">{systemHealth?.uptime || 0} seconds</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Socket.IO Transport:</span>
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>WebSocket (Full Duplex)</span>
            </div>
          </div>
        </div>

        {/* Security & SSRF Safeguards */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <ShieldCheck size={18} style={{ color: '#22c55e' }} />
              SSRF & Security Safeguards
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.78rem', color: '#cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#22c55e' }}>✓</span>
              <span><strong>Private IP Protection:</strong> Blocks RFC 1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16).</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#22c55e' }}>✓</span>
              <span><strong>Cloud Metadata Defense:</strong> Blocks 169.254.169.254 and metadata.google.internal.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#22c55e' }}>✓</span>
              <span><strong>Protocol Whitelisting:</strong> Strictly permits only HTTP and HTTPS schemes.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#22c55e' }}>✓</span>
              <span><strong>Open-Redirect Barrier:</strong> Axios maxRedirects: 0 prevents SSRF hop attacks.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#22c55e' }}>✓</span>
              <span><strong>Rate Limiting:</strong> Express rate limiter guards API against flooding attacks.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
