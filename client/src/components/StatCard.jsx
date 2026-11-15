import React from 'react';

/**
 * StatCard Component
 * Displays an interactive statistic card with cybersecurity-inspired glow,
 * metric value, icon, accent color, and descriptive subtext.
 */
export default function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  accentColor = '#38bdf8',
  valueColor,
  onClick,
  badge,
}) {
  return (
    <div
      className="stat-card"
      style={{
        '--card-accent': accentColor,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
      }}
      onClick={onClick}
    >
      <div className="stat-header">
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </span>
        {Icon && <Icon size={18} style={{ color: accentColor }} />}
      </div>

      <div
        className="stat-value"
        style={{
          color: valueColor || '#f8fafc',
          textShadow: `0 0 20px ${accentColor}25`,
        }}
      >
        {value}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem' }}>
        <div className="stat-subtext" style={{ color: '#64748b', fontSize: '0.78rem' }}>
          {subtext}
        </div>
        {badge && (
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '0.15rem 0.45rem',
              borderRadius: '4px',
              backgroundColor: `${accentColor}15`,
              color: accentColor,
              border: `1px solid ${accentColor}30`,
            }}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
