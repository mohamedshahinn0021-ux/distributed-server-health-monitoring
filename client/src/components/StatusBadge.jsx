import React from 'react';

/**
 * StatusBadge Component
 * Displays server health state according to system theme:
 *  - ACTIVE: Green
 *  - SLOW: Yellow
 *  - DISCONNECTED: Red
 *  - RECOVERING: Blue
 */
export default function StatusBadge({ state, showDot = true, size = 'normal' }) {
  const normState = (state || 'UNKNOWN').toUpperCase();

  const config = {
    ACTIVE: {
      label: 'ACTIVE',
      className: 'badge badge-active',
      dotColor: '#22c55e',
    },
    SLOW: {
      label: 'SLOW',
      className: 'badge badge-slow',
      dotColor: '#eab308',
    },
    DISCONNECTED: {
      label: 'DISCONNECTED',
      className: 'badge badge-disconnected',
      dotColor: '#ef4444',
    },
    RECOVERING: {
      label: 'RECOVERING',
      className: 'badge badge-recovering',
      dotColor: '#3b82f6',
    },
  }[normState] || {
    label: normState,
    className: 'badge',
    dotColor: '#94a3b8',
  };

  const style = size === 'small' ? { fontSize: '0.68rem', padding: '0.2rem 0.5rem' } : {};

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
