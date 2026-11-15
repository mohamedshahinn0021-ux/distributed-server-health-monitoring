import React from 'react';

export default function StateBadge({ state, showDot = true, size = 'normal' }) {
  const normState = (state || 'UNKNOWN').toUpperCase();

  const config = {
    ACTIVE: {
      label: 'Active',
      className: 'badge badge-active',
      dotColor: '#22c55e',
    },
    SLOW: {
      label: 'Slow',
      className: 'badge badge-slow',
      dotColor: '#eab308',
    },
    DISCONNECTED: {
      label: 'Disconnected',
      className: 'badge badge-disconnected',
      dotColor: '#ef4444',
    },
    RECOVERING: {
      label: 'Recovering',
      className: 'badge badge-recovering',
      dotColor: '#3b82f6',
    },
  }[normState] || {
    label: normState,
    className: 'badge',
    dotColor: '#94a3b8',
  };

  const style = size === 'small' ? { fontSize: '0.65rem', padding: '0.15rem 0.45rem' } : {};

  return (
    <span className={config.className} style={style}>
      {showDot && (
        <span
          className="badge-dot"
          style={{ backgroundColor: config.dotColor }}
        />
      )}
      {config.label}
    </span>
  );
}
