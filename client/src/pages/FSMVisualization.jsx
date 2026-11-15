import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  ArrowRight,
  RefreshCw,
  Info,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import StateBadge from '../components/StateBadge.jsx';
import { fetchTransitions } from '../services/api.js';

export default function FSMVisualization({ servers, onCheckServer, checkingServerId }) {
  const [selectedServerId, setSelectedServerId] = useState(servers[0]?._id || '');
  const [transitions, setTransitions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedServerId) {
      loadTransitions(selectedServerId);
    }
  }, [selectedServerId]);

  const loadTransitions = async (serverId) => {
    setLoading(true);
    try {
      const res = await fetchTransitions({ serverId, limit: 20 });
      setTransitions(res.data || []);
    } catch (err) {
      console.error('Failed to load transitions:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedServer = servers.find((s) => s._id === selectedServerId) || servers[0];
  const currentState = selectedServer?.currentState || 'ACTIVE';

  // Node position & styling definitions
  const states = [
    {
      id: 'ACTIVE',
      name: 'ACTIVE',
      color: '#22c55e',
      bg: 'rgba(34, 197, 94, 0.1)',
      border: 'rgba(34, 197, 94, 0.4)',
      glow: '0 0 25px rgba(34, 197, 94, 0.35)',
      description: 'Response time below threshold (HTTP 2xx/3xx)',
      x: 180,
      y: 80,
    },
    {
      id: 'SLOW',
      name: 'SLOW',
      color: '#eab308',
      bg: 'rgba(234, 179, 8, 0.1)',
      border: 'rgba(234, 179, 8, 0.4)',
      glow: '0 0 25px rgba(234, 179, 8, 0.35)',
      description: 'Response time exceeds configured threshold',
      x: 620,
      y: 80,
    },
    {
      id: 'DISCONNECTED',
      name: 'DISCONNECTED',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.1)',
      border: 'rgba(239, 68, 68, 0.4)',
      glow: '0 0 25px rgba(239, 68, 68, 0.35)',
      description: 'Repeated failed connection checks',
      x: 620,
      y: 380,
    },
    {
      id: 'RECOVERING',
      name: 'RECOVERING',
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.1)',
      border: 'rgba(59, 130, 246, 0.4)',
      glow: '0 0 25px rgba(59, 130, 246, 0.35)',
      description: 'First successful check; verifying stability',
      x: 180,
      y: 380,
    },
  ];

  return (
    <div>
      {/* Top Selector Card */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
          <label className="form-label" style={{ margin: 0 }}>Inspected Server:</label>
          <select
            value={selectedServerId}
            onChange={(e) => setSelectedServerId(e.target.value)}
            className="form-select"
            style={{ width: 'auto', minWidth: 260 }}
          >
            {servers.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} — Current: {s.currentState}
              </option>
            ))}
          </select>
        </div>

        {selectedServer && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Live FSM State:</span>
              <StateBadge state={selectedServer.currentState} />
            </div>

            <button
              onClick={() => onCheckServer(selectedServer._id)}
              disabled={checkingServerId === selectedServer._id}
              className="btn btn-secondary btn-sm"
            >
              <RefreshCw
                size={14}
                style={{
                  animation:
                    checkingServerId === selectedServer._id
                      ? 'spin 1s linear infinite'
                      : 'none',
                }}
              />
              <span>Trigger Check</span>
            </button>
          </div>
        )}
      </div>

      {/* Interactive FSM State Diagram */}
      <div className="card" style={{ marginBottom: '1.5rem', overflow: 'hidden' }}>
        <div className="card-header">
          <h2 className="card-title">
            <GitBranch size={18} style={{ color: '#38bdf8' }} />
            Finite-State Machine Architecture Diagram
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Active node highlighted based on server telemetry
          </span>
        </div>

        {/* SVG Diagram Canvas */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '460px',
            backgroundColor: '#070d19',
            borderRadius: '8px',
            border: '1px solid #1e293b',
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 800 460" preserveAspectRatio="xMidYMid meet">
            <defs>
              <marker
                id="arrow-green"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#22c55e" />
              </marker>
              <marker
                id="arrow-yellow"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#eab308" />
              </marker>
              <marker
                id="arrow-red"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#ef4444" />
              </marker>
              <marker
                id="arrow-blue"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#3b82f6" />
              </marker>
              <marker
                id="arrow-dim"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#475569" />
              </marker>
            </defs>

            {/* Transition 1: ACTIVE -> SLOW (top horizontal forward) */}
            <path
              d="M 280 65 L 520 65"
              fill="none"
              stroke="#eab308"
              strokeWidth="2"
              markerEnd="url(#arrow-yellow)"
            />
            <text x="400" y="55" fill="#eab308" fontSize="11" textAnchor="middle" fontWeight="600">
              Latency &gt; Threshold
            </text>

            {/* Transition 2: SLOW -> ACTIVE (top horizontal return) */}
            <path
              d="M 520 95 L 280 95"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
              markerEnd="url(#arrow-green)"
            />
            <text x="400" y="112" fill="#22c55e" fontSize="11" textAnchor="middle" fontWeight="600">
              Latency &le; Threshold
            </text>

            {/* Transition 3: ACTIVE -> DISCONNECTED (diagonal cross) */}
            <path
              d="M 260 115 L 540 345"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="4 4"
              markerEnd="url(#arrow-red)"
            />
            <text x="350" y="220" fill="#ef4444" fontSize="11" textAnchor="middle" fontWeight="600">
              Failure &ge; 2 checks
            </text>

            {/* Transition 4: SLOW -> DISCONNECTED (right vertical) */}
            <path
              d="M 620 125 L 620 335"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              markerEnd="url(#arrow-red)"
            />
            <text x="645" y="240" fill="#ef4444" fontSize="11" textAnchor="start" fontWeight="600">
              Failure &ge; 2 checks
            </text>

            {/* Transition 5: DISCONNECTED -> RECOVERING (bottom horizontal left) */}
            <path
              d="M 520 380 L 280 380"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              markerEnd="url(#arrow-blue)"
            />
            <text x="400" y="370" fill="#3b82f6" fontSize="11" textAnchor="middle" fontWeight="600">
              First Successful Response (1x 200 OK)
            </text>

            {/* Transition 6: RECOVERING -> ACTIVE (left vertical up) */}
            <path
              d="M 180 335 L 180 125"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
              markerEnd="url(#arrow-green)"
            />
            <text x="165" y="240" fill="#22c55e" fontSize="11" textAnchor="end" fontWeight="600">
              &ge; 2 Successes Verified
            </text>

            {/* Transition 7: RECOVERING -> DISCONNECTED (bottom return fallback) */}
            <path
              d="M 280 405 L 520 405"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="3 3"
              markerEnd="url(#arrow-red)"
            />
            <text x="400" y="423" fill="#ef4444" fontSize="10" textAnchor="middle">
              Check Failed During Recovery
            </text>

            {/* Render 4 State Nodes */}
            {states.map((st) => {
              const isCurrent = currentState === st.id;
              return (
                <g key={st.id} transform={`translate(${st.x - 90}, ${st.y - 40})`}>
                  <rect
                    width="180"
                    height="80"
                    rx="12"
                    fill={isCurrent ? st.bg : '#0f172a'}
                    stroke={isCurrent ? st.color : '#334155'}
                    strokeWidth={isCurrent ? '3' : '1'}
                    style={{
                      filter: isCurrent ? `drop-shadow(0 0 15px ${st.color}80)` : 'none',
                      transition: 'all 0.3s ease',
                    }}
                  />
                  <circle
                    cx="25"
                    cy="40"
                    r="8"
                    fill={st.color}
                    style={{
                      animation: isCurrent ? 'pulse 1.5s infinite' : 'none',
                    }}
                  />
                  <text
                    x="42"
                    y="36"
                    fill="#fff"
                    fontSize="14"
                    fontWeight="800"
                    letterSpacing="0.05em"
                  >
                    {st.name}
                  </text>
                  <text
                    x="42"
                    y="55"
                    fill={isCurrent ? st.color : '#64748b'}
                    fontSize="10"
                    fontWeight="600"
                  >
                    {isCurrent ? '● CURRENT STATE' : 'Idle State'}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Diagnostics Card */}
      {selectedServer && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h2 className="card-title">
              <Info size={18} style={{ color: '#38bdf8' }} />
              Active FSM Telemetry: {selectedServer.name}
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            <div style={{ padding: '0.85rem', backgroundColor: '#0f172a', borderRadius: '6px' }}>
              <div style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                CURRENT FSM STATE
              </div>
              <div style={{ marginTop: '0.35rem' }}>
                <StateBadge state={selectedServer.currentState} />
              </div>
            </div>

            <div style={{ padding: '0.85rem', backgroundColor: '#0f172a', borderRadius: '6px' }}>
              <div style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                CONSECUTIVE FAILURES
              </div>
              <div className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444' }}>
                {selectedServer.consecutiveFailures || 0}
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '5px' }}>
                  / {selectedServer.failureThreshold || 2} threshold
                </span>
              </div>
            </div>

            <div style={{ padding: '0.85rem', backgroundColor: '#0f172a', borderRadius: '6px' }}>
              <div style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                CONSECUTIVE SUCCESSES
              </div>
              <div className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#22c55e' }}>
                {selectedServer.consecutiveSuccesses || 0}
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '5px' }}>
                  / {selectedServer.recoveryThreshold || 2} to verify recovery
                </span>
              </div>
            </div>

            <div style={{ padding: '0.85rem', backgroundColor: '#0f172a', borderRadius: '6px' }}>
              <div style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                LAST MEASURED LATENCY
              </div>
              <div className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>
                {selectedServer.lastResponseTime || 0} ms
              </div>
            </div>
          </div>
        </div>
      )}

      {/* State Transitions Log Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <Clock size={18} style={{ color: '#38bdf8' }} />
            FSM Transition History Log
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Latest state changes for {selectedServer?.name}
          </span>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Transition Flow</th>
                <th>Trigger Reason</th>
                <th>Latency</th>
                <th>Status Code</th>
              </tr>
            </thead>
            <tbody>
              {transitions.map((tr) => (
                <tr key={tr._id}>
                  <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    {new Date(tr.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <StateBadge state={tr.previousState} showDot={false} size="small" />
                      <span style={{ color: '#64748b' }}>→</span>
                      <StateBadge state={tr.newState} size="small" />
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{tr.reason}</td>
                  <td>
                    <span className="font-mono">{tr.responseTime || 0} ms</span>
                  </td>
                  <td>
                    {tr.statusCode ? (
                      <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                        {tr.statusCode}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
              {transitions.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No state transitions recorded yet for this server.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
