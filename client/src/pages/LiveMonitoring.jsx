import React, { useState } from 'react';
import {
  Activity,
  Radio,
  Clock,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
} from 'lucide-react';
import StateBadge from '../components/StateBadge.jsx';

export default function LiveMonitoring({
  servers,
  livePings,
  onCheckServer,
  checkingServerId,
  isConnected,
}) {
  const [filterState, setFilterState] = useState('ALL');

  const filteredServers = servers.filter((s) => {
    if (filterState === 'ALL') return true;
    return s.currentState === filterState;
  });

  return (
    <div>
      {/* Live Status Bar */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'linear-gradient(90deg, #131d33, #182645)',
          borderLeft: `4px solid ${isConnected ? '#22c55e' : '#ef4444'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: isConnected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Radio
              size={18}
              style={{
                color: isConnected ? '#22c55e' : '#ef4444',
                animation: isConnected ? 'pulse 2s infinite' : 'none',
              }}
            />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              Real-time Socket.IO Telemetry Stream
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {isConnected
                ? 'Active WebSocket channel • Receiving millisecond heartbeat metrics'
                : 'Connection dropped • Retrying WebSocket reconnect...'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {['ALL', 'ACTIVE', 'SLOW', 'DISCONNECTED', 'RECOVERING'].map((state) => (
            <button
              key={state}
              onClick={() => setFilterState(state)}
              className={`btn btn-sm ${filterState === state ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.72rem' }}
            >
              {state}
            </button>
          ))}
        </div>
      </div>

      {/* Main Live Monitoring Layout: Left Live Server Grid, Right Live Event Log */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Left: Active Server Live Pulse Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Live Monitored Nodes ({filteredServers.length})
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
            }}
          >
            {filteredServers.map((server) => {
              const isChecking = checkingServerId === server._id;
              const isSlow = server.currentState === 'SLOW';
              const isDisconnected = server.currentState === 'DISCONNECTED';
              const isRecovering = server.currentState === 'RECOVERING';

              let borderColor = '#1e293b';
              if (server.currentState === 'ACTIVE') borderColor = 'rgba(34, 197, 94, 0.4)';
              if (isSlow) borderColor = 'rgba(234, 179, 8, 0.5)';
              if (isDisconnected) borderColor = 'rgba(239, 68, 68, 0.5)';
              if (isRecovering) borderColor = 'rgba(59, 130, 246, 0.5)';

              return (
                <div
                  key={server._id}
                  className="card"
                  style={{
                    borderColor,
                    position: 'relative',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{server.name}</div>
                      <div
                        className="font-mono"
                        style={{
                          fontSize: '0.7rem',
                          color: '#38bdf8',
                          marginTop: '2px',
                          maxWidth: 220,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {server.url}
                      </div>
                    </div>
                    <StateBadge state={server.currentState} size="small" />
                  </div>

                  {/* Latency Meter Bar */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: '#94a3b8' }}>Latency</span>
                      <span className="font-mono" style={{ fontWeight: 700, color: isSlow ? '#eab308' : '#fff' }}>
                        {server.lastResponseTime || 0} ms{' '}
                        <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                          (max {server.responseThreshold}ms)
                        </span>
                      </span>
                    </div>
                    <div
                      style={{
                        height: 5,
                        backgroundColor: '#0f172a',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(
                            ((server.lastResponseTime || 0) / (server.responseThreshold || 500)) * 100,
                            100
                          )}%`,
                          backgroundColor:
                            isDisconnected
                              ? '#ef4444'
                              : isSlow
                              ? '#eab308'
                              : isRecovering
                              ? '#3b82f6'
                              : '#22c55e',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Diagnostics Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.72rem',
                      color: '#94a3b8',
                      paddingTop: '0.5rem',
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <div>
                      Interval: <span className="font-mono">{server.monitoringInterval}s</span>
                    </div>

                    <button
                      onClick={() => onCheckServer(server._id)}
                      disabled={isChecking}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                    >
                      <RefreshCw
                        size={11}
                        style={{
                          animation: isChecking ? 'spin 1s linear infinite' : 'none',
                        }}
                      />
                      <span>Ping</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Real-time Live Heartbeat Log Stream */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '620px' }}>
          <div className="card-header">
            <h2 className="card-title">
              <Zap size={18} style={{ color: '#38bdf8' }} />
              Live Health-Check Stream
            </h2>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Auto-updating via Socket.IO
            </span>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              paddingRight: '0.25rem',
            }}
          >
            {livePings.map((ping, idx) => (
              <div
                key={idx}
                style={{
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'rgba(15, 23, 42, 0.7)',
                  borderRadius: '6px',
                  border: '1px solid #1e293b',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span
                    className="pulse-dot"
                    style={{
                      backgroundColor:
                        ping.currentState === 'ACTIVE'
                          ? '#22c55e'
                          : ping.currentState === 'SLOW'
                          ? '#eab308'
                          : ping.currentState === 'DISCONNECTED'
                          ? '#ef4444'
                          : '#3b82f6',
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600 }}>{ping.serverName}</span>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {ping.statusCode ? `HTTP ${ping.statusCode}` : 'No response'} • {ping.reason}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="font-mono" style={{ fontWeight: 700, color: '#38bdf8' }}>
                    {ping.responseTime} ms
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    {new Date(ping.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}

            {livePings.length === 0 && (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  fontSize: '0.82rem',
                }}
              >
                Awaiting incoming socket ping telemetry packets...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
