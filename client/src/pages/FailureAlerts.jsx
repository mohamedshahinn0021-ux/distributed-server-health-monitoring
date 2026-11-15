import React, { useState } from 'react';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Check,
  CheckCheck,
  Trash2,
  Filter,
} from 'lucide-react';

export default function FailureAlerts({
  alerts,
  onMarkRead,
  onMarkAllRead,
  onDeleteAlert,
  showToast,
}) {
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [readFilter, setReadFilter] = useState('ALL');

  const filteredAlerts = alerts.filter((a) => {
    const matchesSeverity = severityFilter === 'ALL' || a.severity === severityFilter;
    const matchesRead =
      readFilter === 'ALL' ||
      (readFilter === 'UNREAD' && !a.isRead) ||
      (readFilter === 'READ' && a.isRead);
    return matchesSeverity && matchesRead;
  });

  const unreadCount = alerts.filter((a) => !a.isRead).length;

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
            }}
          >
            <XCircle size={12} />
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
            }}
          >
            <AlertTriangle size={12} />
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
            }}
          >
            <CheckCircle size={12} />
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
            }}
          >
            <Info size={12} />
            INFO
          </span>
        );
    }
  };

  return (
    <div>
      {/* Top Filter and Actions Bar */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Filter size={15} style={{ color: '#64748b' }} />
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>SEVERITY:</span>
          </div>

          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {['ALL', 'CRITICAL', 'WARNING', 'INFO', 'SUCCESS'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`btn btn-sm ${severityFilter === sev ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.72rem' }}
              >
                {sev}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', marginLeft: '0.5rem' }}>
            {['ALL', 'UNREAD', 'READ'].map((rf) => (
              <button
                key={rf}
                onClick={() => setReadFilter(rf)}
                className={`btn btn-sm ${readFilter === rf ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.72rem' }}
              >
                {rf}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {unreadCount > 0 && (
            <button onClick={onMarkAllRead} className="btn btn-secondary btn-sm">
              <CheckCheck size={14} style={{ color: '#38bdf8' }} />
              <span>Mark All Read ({unreadCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <Bell size={18} style={{ color: '#ef4444' }} />
            <span>Alert Events Log</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
              ({filteredAlerts.length} recorded)
            </span>
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredAlerts.map((alert) => (
            <div
              key={alert._id}
              style={{
                padding: '1rem',
                backgroundColor: alert.isRead ? 'rgba(15, 23, 42, 0.4)' : 'rgba(30, 41, 59, 0.7)',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: alert.isRead ? '#1e293b' : 'rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '1rem',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', gap: '0.85rem', flex: 1 }}>
                <div style={{ marginTop: '0.15rem' }}>{getSeverityBadge(alert.severity)}</div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                      {alert.title}
                    </span>
                    {!alert.isRead && (
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          backgroundColor: '#38bdf8',
                        }}
                      />
                    )}
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    {alert.message}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.72rem', color: '#64748b' }}>
                    <span>
                      Server: <strong style={{ color: '#94a3b8' }}>{alert.serverName}</strong>
                    </span>
                    <span>•</span>
                    <span>{new Date(alert.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {!alert.isRead && (
                  <button
                    onClick={() => onMarkRead(alert._id)}
                    className="btn btn-secondary btn-icon"
                    title="Mark as read"
                  >
                    <Check size={14} />
                  </button>
                )}
                <button
                  onClick={() => onDeleteAlert(alert._id)}
                  className="btn btn-danger btn-icon"
                  title="Remove alert"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {filteredAlerts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              No failure alerts match the selected filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
