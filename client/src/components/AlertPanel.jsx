import React from 'react';
import {
  Bell,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Info,
  Check,
  Trash2,
} from 'lucide-react';

/**
 * AlertPanel Component
 * Displays real-time and historical failure alerts with severity classification,
 * mark-as-read toggles, and deletion options.
 */
export default function AlertPanel({
  alerts = [],
  onMarkRead,
  onDeleteAlert,
  compact = false,
  maxItems = null,
}) {
  const displayAlerts = maxItems ? alerts.slice(0, maxItems) : alerts;

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span
            className="badge"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              fontSize: '0.68rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <XCircle size={11} />
            CRITICAL
          </span>
        );
      case 'WARNING':
        return (
          <span
            className="badge"
            style={{
              backgroundColor: 'rgba(234, 179, 8, 0.15)',
              color: '#eab308',
              borderColor: 'rgba(234, 179, 8, 0.3)',
              fontSize: '0.68rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <AlertTriangle size={11} />
            WARNING
          </span>
        );
      case 'SUCCESS':
        return (
          <span
            className="badge"
            style={{
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              color: '#22c55e',
              borderColor: 'rgba(34, 197, 94, 0.3)',
              fontSize: '0.68rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <CheckCircle size={11} />
            SUCCESS
          </span>
        );
      default:
        return (
          <span
            className="badge"
            style={{
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              borderColor: 'rgba(56, 189, 248, 0.3)',
              fontSize: '0.68rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <Info size={11} />
            INFO
          </span>
        );
    }
  };

  if (displayAlerts.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: compact ? '1.5rem 1rem' : '3rem 1rem',
          color: '#64748b',
          backgroundColor: '#0a0f1d',
          borderRadius: '8px',
          border: '1px dashed #1e293b',
        }}
      >
        <Bell size={24} style={{ margin: '0 auto 0.5rem', color: '#22c55e', opacity: 0.7 }} />
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>No active failure alerts</p>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>All monitored clusters operating nominal</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {displayAlerts.map((alert) => (
        <div
          key={alert._id}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: compact ? '0.65rem 0.85rem' : '0.85rem 1rem',
            borderRadius: '6px',
            backgroundColor: alert.isRead ? 'rgba(15, 23, 42, 0.4)' : 'rgba(30, 41, 59, 0.6)',
            border: `1px solid ${
              !alert.isRead && alert.severity === 'CRITICAL'
                ? 'rgba(239, 68, 68, 0.35)'
                : !alert.isRead && alert.severity === 'WARNING'
                ? 'rgba(234, 179, 8, 0.3)'
                : '#1e293b'
            }`,
            borderLeft: `4px solid ${
              alert.severity === 'CRITICAL'
                ? '#ef4444'
                : alert.severity === 'WARNING'
                ? '#eab308'
                : alert.severity === 'SUCCESS'
                ? '#22c55e'
                : '#38bdf8'
            }`,
            transition: 'all 0.15s ease',
            opacity: alert.isRead ? 0.75 : 1,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
              {getSeverityBadge(alert.severity)}
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: alert.isRead ? '#94a3b8' : '#f8fafc' }}>
                {alert.title}
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  color: '#38bdf8',
                  background: 'rgba(56, 189, 248, 0.1)',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '3px',
                }}
              >
                {alert.serverName}
              </span>
            </div>

            <p style={{ margin: '0.2rem 0 0.35rem 0', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.4 }}>
              {alert.message}
            </p>

            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {new Date(alert.createdAt).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.1rem' }}>
            {!alert.isRead && onMarkRead && (
              <button
                onClick={() => onMarkRead(alert._id)}
                className="btn-icon"
                title="Mark as read"
                style={{
                  background: 'rgba(56, 189, 248, 0.1)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  padding: '0.3rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                <Check size={13} />
              </button>
            )}

            {onDeleteAlert && (
              <button
                onClick={() => onDeleteAlert(alert._id)}
                className="btn-icon"
                title="Delete alert"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  padding: '0.3rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
