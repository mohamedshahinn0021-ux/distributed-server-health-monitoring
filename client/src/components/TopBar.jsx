import React from 'react';
import { RefreshCw, PlayCircle, ShieldAlert } from 'lucide-react';

export default function TopBar({
  title,
  description,
  onRefresh,
  isRefreshing,
  onOpenQuickTest,
}) {
  return (
    <header className="top-bar">
      <div className="page-title-box">
        <h1 className="page-title">{title}</h1>
        <p className="page-description">{description}</p>
      </div>

      <div className="top-bar-actions">
        {onOpenQuickTest && (
          <button
            onClick={onOpenQuickTest}
            className="btn btn-secondary btn-sm"
            title="Open Interactive Simulator"
          >
            <PlayCircle size={15} style={{ color: '#38bdf8' }} />
            <span>Simulate FSM</span>
          </button>
        )}

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="btn btn-secondary btn-sm"
          title="Refresh view data"
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
