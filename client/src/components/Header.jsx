import React from 'react';
import { RefreshCw, PlayCircle, ShieldCheck, Activity } from 'lucide-react';

/**
 * Header Component
 * Top bar providing title, description, real-time Socket.IO indicators, and quick triggers.
 */
export default function Header({
  title,
  description,
  onRefresh,
  isRefreshing,
  onOpenQuickTest,
  isConnected,
  lastUpdated,
}) {
  return (
    <header className="top-bar">
      <div className="page-title-box">
        <h1 className="page-title">{title}</h1>
        <p className="page-description">{description}</p>
      </div>

      <div className="top-bar-actions">
        {/* Real-time Connection Indicator */}
        <div
          className="connection-pill"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 500,
            background: isConnected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${isConnected ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
            color: isConnected ? '#4ade80' : '#f87171',
          }}
          title={isConnected ? 'Live Socket.IO stream active' : 'Disconnected from WebSocket'}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: isConnected ? '#22c55e' : '#ef4444',
              boxShadow: isConnected ? '0 0 8px #22c55e' : 'none',
              animation: isConnected ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
            }}
          />
          <span>{isConnected ? 'LIVE STREAM' : 'OFFLINE'}</span>
        </div>

        {onOpenQuickTest && (
          <button
            onClick={onOpenQuickTest}
            className="btn btn-secondary btn-sm"
            title="Open Interactive FSM Simulator"
          >
            <PlayCircle size={15} style={{ color: '#38bdf8' }} />
            <span>Simulate FSM</span>
          </button>
        )}

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="btn btn-secondary btn-sm"
          title="Refresh view telemetry"
        >
          <RefreshCw
            size={14}
            className={isRefreshing ? 'animate-spin' : ''}
            style={{
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
            }}
          />
          <span>Refresh</span>
        </button>
      </div>
    </header>
  );
}
