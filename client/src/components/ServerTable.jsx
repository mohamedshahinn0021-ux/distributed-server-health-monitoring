import React from 'react';
import {
  RefreshCw,
  Edit2,
  Trash2,
  ExternalLink,
  Power,
  Info,
  Clock,
  Zap,
} from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';

/**
 * ServerTable Component
 * Reusable table displaying configured servers, health indicators,
 * thresholds, latency, and operational management actions.
 */
export default function ServerTable({
  servers = [],
  onCheckServer,
  checkingServerId,
  onEditServer,
  onDeleteServer,
  onToggleEnabled,
  onViewDetails,
  compact = false,
}) {
  if (servers.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          color: '#64748b',
          backgroundColor: '#0a0f1d',
          borderRadius: '8px',
          border: '1px dashed #1e293b',
        }}
      >
        <Info size={32} style={{ margin: '0 auto 0.75rem', color: '#38bdf8' }} />
        <h4 style={{ color: '#e2e8f0', marginBottom: '0.25rem' }}>No servers found</h4>
        <p style={{ fontSize: '0.85rem' }}>
          No servers match the selected criteria or none have been registered yet.
        </p>
      </div>
    );
  }

  return (
    <div className="table-responsive" style={{ overflowX: 'auto' }}>
      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #1e293b', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>
            <th style={{ padding: '0.75rem 1rem' }}>Server & Endpoint</th>
            <th style={{ padding: '0.75rem 1rem' }}>State</th>
            <th style={{ padding: '0.75rem 1rem' }}>Latency / Threshold</th>
            <th style={{ padding: '0.75rem 1rem' }}>Interval</th>
            {!compact && <th style={{ padding: '0.75rem 1rem' }}>Last Checked</th>}
            <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {servers.map((server) => {
            const isChecking = checkingServerId === server._id;
            const latency = server.lastResponseTime || 0;
            const isSlow = latency > (server.responseThreshold || 500);

            return (
              <tr
                key={server._id}
                style={{
                  borderBottom: '1px solid #111a2e',
                  transition: 'background-color 0.15s ease',
                  opacity: server.enabled ? 1 : 0.6,
                }}
                className="table-row-hover"
              >
                {/* Server Name & URL */}
                <td style={{ padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.9rem' }}>
                      {server.name}
                    </div>
                    {!server.enabled && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          background: '#334155',
                          color: '#94a3b8',
                          padding: '0.1rem 0.35rem',
                          borderRadius: '3px',
                        }}
                      >
                        PAUSED
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: '#64748b',
                      marginTop: '0.15rem',
                      fontFamily: 'monospace',
                      maxWidth: '280px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={server.url}
                  >
                    {server.url}
                  </div>
                </td>

                {/* State Badge */}
                <td style={{ padding: '0.85rem 1rem' }}>
                  <StatusBadge state={server.currentState} />
                </td>

                {/* Response Time & Threshold */}
                <td style={{ padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        color:
                          server.currentState === 'DISCONNECTED'
                            ? '#ef4444'
                            : isSlow
                            ? '#eab308'
                            : '#22c55e',
                      }}
                    >
                      {server.currentState === 'DISCONNECTED' ? 'OFFLINE' : `${latency}ms`}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      / max {server.responseThreshold}ms
                    </span>
                  </div>
                  {server.lastStatusCode && (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        color: server.lastStatusCode < 400 ? '#4ade80' : '#f87171',
                        fontFamily: 'monospace',
                      }}
                    >
                      HTTP {server.lastStatusCode}
                    </span>
                  )}
                </td>

                {/* Interval */}
                <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: '#94a3b8' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={12} style={{ color: '#64748b' }} />
                    <span>{server.monitoringInterval}s</span>
                  </div>
                </td>

                {/* Last Checked */}
                {!compact && (
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                    {server.lastCheckedAt
                      ? new Date(server.lastCheckedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : 'Never'}
                  </td>
                )}

                {/* Actions */}
                <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    {/* Manual Check Now */}
                    {onCheckServer && (
                      <button
                        onClick={() => onCheckServer(server._id)}
                        disabled={isChecking}
                        className="btn-icon"
                        title="Run On-Demand Health Check"
                        style={{
                          background: 'rgba(56, 189, 248, 0.1)',
                          color: '#38bdf8',
                          border: '1px solid rgba(56, 189, 248, 0.2)',
                          padding: '0.35rem',
                          borderRadius: '4px',
                          cursor: isChecking ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <RefreshCw
                          size={14}
                          style={{
                            animation: isChecking ? 'spin 1s linear infinite' : 'none',
                          }}
                        />
                      </button>
                    )}

                    {/* View Details */}
                    {onViewDetails && (
                      <button
                        onClick={() => onViewDetails(server)}
                        className="btn-icon"
                        title="View Detailed Info"
                        style={{
                          background: 'rgba(148, 163, 184, 0.1)',
                          color: '#94a3b8',
                          border: '1px solid rgba(148, 163, 184, 0.2)',
                          padding: '0.35rem',
                          borderRadius: '4px',
                        }}
                      >
                        <Info size={14} />
                      </button>
                    )}

                    {/* Toggle Enabled */}
                    {onToggleEnabled && (
                      <button
                        onClick={() => onToggleEnabled(server)}
                        className="btn-icon"
                        title={server.enabled ? 'Pause Monitoring' : 'Resume Monitoring'}
                        style={{
                          background: server.enabled ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: server.enabled ? '#22c55e' : '#ef4444',
                          border: `1px solid ${server.enabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                          padding: '0.35rem',
                          borderRadius: '4px',
                        }}
                      >
                        <Power size={14} />
                      </button>
                    )}

                    {/* Edit Server */}
                    {onEditServer && (
                      <button
                        onClick={() => onEditServer(server)}
                        className="btn-icon"
                        title="Edit Server Configuration"
                        style={{
                          background: 'rgba(234, 179, 8, 0.1)',
                          color: '#eab308',
                          border: '1px solid rgba(234, 179, 8, 0.2)',
                          padding: '0.35rem',
                          borderRadius: '4px',
                        }}
                      >
                        <Edit2 size={14} />
                      </button>
                    )}

                    {/* Delete Server */}
                    {onDeleteServer && (
                      <button
                        onClick={() => onDeleteServer(server)}
                        className="btn-icon"
                        title="Delete Server"
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          padding: '0.35rem',
                          borderRadius: '4px',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
