import React, { useState } from 'react';
import {
  GitBranch,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  Layers,
} from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';

/**
 * FSMDiagram Component
 * Interactive Finite-State Machine visualizer rendering all 4 states,
 * state transition paths, current active highlight, and condition cards.
 */
export default function FSMDiagram({
  currentState = 'ACTIVE',
  serverName = 'Selected Server',
  latestReason = '',
  transitions = [],
  onSelectState,
}) {
  const [hoveredState, setHoveredState] = useState(null);

  const states = [
    {
      id: 'ACTIVE',
      name: 'ACTIVE',
      color: '#22c55e',
      bg: 'rgba(34, 197, 94, 0.1)',
      border: 'rgba(34, 197, 94, 0.45)',
      glow: '0 0 25px rgba(34, 197, 94, 0.4)',
      description: 'Nominal operation: response time <= threshold (HTTP 2xx/3xx)',
      x: 170,
      y: 90,
    },
    {
      id: 'SLOW',
      name: 'SLOW',
      color: '#eab308',
      bg: 'rgba(234, 179, 8, 0.1)',
      border: 'rgba(234, 179, 8, 0.45)',
      glow: '0 0 25px rgba(234, 179, 8, 0.4)',
      description: 'Degraded latency: response time exceeds threshold',
      x: 580,
      y: 90,
    },
    {
      id: 'DISCONNECTED',
      name: 'DISCONNECTED',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.1)',
      border: 'rgba(239, 68, 68, 0.45)',
      glow: '0 0 25px rgba(239, 68, 68, 0.4)',
      description: 'Unreachable: repeated timeouts or failed health checks',
      x: 580,
      y: 350,
    },
    {
      id: 'RECOVERING',
      name: 'RECOVERING',
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.1)',
      border: 'rgba(59, 130, 246, 0.45)',
      glow: '0 0 25px rgba(59, 130, 246, 0.4)',
      description: 'Verification: first successful check; requiring consecutive passes',
      x: 170,
      y: 350,
    },
  ];

  return (
    <div style={{ width: '100%' }}>
      {/* Visual Canvas Container */}
      <div
        style={{
          position: 'relative',
          backgroundColor: '#0a0f1d',
          borderRadius: '12px',
          border: '1px solid #1e293b',
          overflow: 'hidden',
          padding: '1rem',
          boxShadow: 'inset 0 0 40px rgba(2, 6, 23, 0.8)',
        }}
      >
        {/* Current State Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.6rem 1rem',
            backgroundColor: '#0f172a',
            borderRadius: '8px',
            border: '1px solid #1e293b',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Target:</span>
            <strong style={{ color: '#f8fafc', fontSize: '0.9rem' }}>{serverName}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Live FSM State:</span>
            <StatusBadge state={currentState} />
          </div>
        </div>

        {/* SVG Diagram Canvas */}
        <div style={{ position: 'relative', width: '100%', height: '460px' }}>
          <svg
            viewBox="0 0 760 440"
            style={{ width: '100%', height: '100%' }}
          >
            <defs>
              {/* Arrow Markers */}
              <marker id="arrow-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#22c55e" />
              </marker>
              <marker id="arrow-yellow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#eab308" />
              </marker>
              <marker id="arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#ef4444" />
              </marker>
              <marker id="arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#3b82f6" />
              </marker>
              <marker id="arrow-cyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#06b6d4" />
              </marker>
              <marker id="arrow-gray" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#475569" />
              </marker>
            </defs>

            {/* Grid Lines Background */}
            <g opacity="0.07">
              {Array.from({ length: 15 }).map((_, i) => (
                <line key={`v-${i}`} x1={i * 50} y1="0" x2={i * 50} y2="440" stroke="#38bdf8" strokeWidth="1" />
              ))}
              {Array.from({ length: 9 }).map((_, i) => (
                <line key={`h-${i}`} x1="0" y1={i * 50} x2="760" y2={i * 50} stroke="#38bdf8" strokeWidth="1" />
              ))}
            </g>

            {/* 1. Transition: ACTIVE -> SLOW (top curve right) */}
            <path
              d="M 270 75 Q 380 40 470 75"
              fill="none"
              stroke="#eab308"
              strokeWidth="2.5"
              strokeDasharray="5,4"
              markerEnd="url(#arrow-yellow)"
            />
            <text x="380" y="52" fill="#eab308" fontSize="10.5" textAnchor="middle" fontWeight="bold">
              Latency &gt; Threshold
            </text>

            {/* 2. Transition: SLOW -> ACTIVE (top curve left) */}
            <path
              d="M 470 105 Q 380 135 270 105"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2.5"
              markerEnd="url(#arrow-green)"
            />
            <text x="380" y="140" fill="#22c55e" fontSize="10.5" textAnchor="middle" fontWeight="bold">
              Normal Latency (&lt;= Threshold)
            </text>

            {/* 3. Transition: ACTIVE -> DISCONNECTED (diagonal cross) */}
            <path
              d="M 270 115 Q 370 230 475 330"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeDasharray="4,4"
              markerEnd="url(#arrow-red)"
            />
            <text x="385" y="240" fill="#ef4444" fontSize="10" textAnchor="middle" fontWeight="bold">
              &gt;= 2 Failures
            </text>

            {/* 4. Transition: SLOW -> DISCONNECTED (straight down right) */}
            <path
              d="M 580 140 L 580 295"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
              markerEnd="url(#arrow-red)"
            />
            <text x="645" y="220" fill="#ef4444" fontSize="10.5" textAnchor="middle" fontWeight="bold">
              Repeated Failures
            </text>

            {/* 5. Transition: DISCONNECTED -> RECOVERING (bottom line left) */}
            <path
              d="M 470 350 L 275 350"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              markerEnd="url(#arrow-blue)"
            />
            <text x="375" y="340" fill="#3b82f6" fontSize="10.5" textAnchor="middle" fontWeight="bold">
              1st Successful Check
            </text>

            {/* 6. Transition: RECOVERING -> ACTIVE (straight up left) */}
            <path
              d="M 170 300 L 170 145"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2.5"
              markerEnd="url(#arrow-green)"
            />
            <text x="105" y="220" fill="#22c55e" fontSize="10.5" textAnchor="middle" fontWeight="bold">
              &gt;= 2 Successes
            </text>

            {/* 7. Transition: RECOVERING -> DISCONNECTED (curve back right) */}
            <path
              d="M 270 375 Q 380 405 470 375"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="4,3"
              markerEnd="url(#arrow-red)"
            />
            <text x="375" y="415" fill="#ef4444" fontSize="10" textAnchor="middle" fontWeight="bold">
              Any Failure during recovery
            </text>

            {/* State Nodes */}
            {states.map((st) => {
              const isCurrent = currentState === st.id;
              const isHovered = hoveredState === st.id;

              return (
                <g
                  key={st.id}
                  transform={`translate(${st.x}, ${st.y})`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredState(st.id)}
                  onMouseLeave={() => setHoveredState(null)}
                  onClick={() => onSelectState && onSelectState(st.id)}
                >
                  {/* Outer Pulsing Aura if active */}
                  {isCurrent && (
                    <rect
                      x="-105"
                      y="-42"
                      width="210"
                      height="84"
                      rx="16"
                      fill="none"
                      stroke={st.color}
                      strokeWidth="2"
                      opacity="0.8"
                    >
                      <animate
                        attributeName="stroke-width"
                        values="2;6;2"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.8;0.2;0.8"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </rect>
                  )}

                  {/* Main Node Box */}
                  <rect
                    x="-100"
                    y="-38"
                    width="200"
                    height="76"
                    rx="12"
                    fill={isCurrent ? st.bg : '#0b1329'}
                    stroke={isCurrent ? st.color : isHovered ? st.color : st.border}
                    strokeWidth={isCurrent ? 2.5 : 1.5}
                    style={{
                      filter: isCurrent ? `drop-shadow(${st.glow})` : 'none',
                      transition: 'all 0.25s ease',
                    }}
                  />

                  {/* State Name */}
                  <text
                    x="0"
                    y="-8"
                    fill={st.color}
                    fontSize="15"
                    fontWeight="800"
                    textAnchor="middle"
                    letterSpacing="0.05em"
                  >
                    {st.name}
                  </text>

                  {/* State Subtitle / Indicator */}
                  <text
                    x="0"
                    y="14"
                    fill={isCurrent ? '#f8fafc' : '#94a3b8'}
                    fontSize="9.5"
                    textAnchor="middle"
                    fontWeight={isCurrent ? 'bold' : 'normal'}
                  >
                    {isCurrent ? '● CURRENT LIVE STATE' : st.id === 'ACTIVE' ? 'Optimal Performance' : st.id === 'SLOW' ? 'High Latency' : st.id === 'DISCONNECTED' ? 'Offline Outage' : 'Stabilizing'}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Transition Explanation Card */}
        {latestReason && (
          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#0f172a',
              borderRadius: '8px',
              border: '1px solid #1e293b',
              borderLeft: `4px solid ${
                currentState === 'ACTIVE'
                  ? '#22c55e'
                  : currentState === 'SLOW'
                  ? '#eab308'
                  : currentState === 'DISCONNECTED'
                  ? '#ef4444'
                  : '#3b82f6'
              }`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
              <Info size={13} style={{ color: '#38bdf8' }} />
              <span>Latest FSM Transition Reason:</span>
            </div>
            <div style={{ color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 500 }}>
              {latestReason}
            </div>
          </div>
        )}
      </div>

      {/* State Transitions Reference Matrix */}
      <div
        style={{
          marginTop: '1.25rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.75rem',
        }}
      >
        <div className="card" style={{ padding: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#22c55e', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22c55e' }} />
            ACTIVE
          </div>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
            Server responds normally within threshold. Transitions to <strong>SLOW</strong> on high latency, or to <strong>DISCONNECTED</strong> after consecutive failures.
          </p>
        </div>

        <div className="card" style={{ padding: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#eab308', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#eab308' }} />
            SLOW
          </div>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
            Server responds but latency exceeds responseThreshold. Transitions back to <strong>ACTIVE</strong> when latency normalizes, or to <strong>DISCONNECTED</strong> on failure.
          </p>
        </div>

        <div className="card" style={{ padding: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ef4444', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444' }} />
            DISCONNECTED
          </div>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
            Server is unreachable or returns 5xx error. First successful response transitions it to <strong>RECOVERING</strong>.
          </p>
        </div>

        <div className="card" style={{ padding: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#3b82f6', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3b82f6' }} />
            RECOVERING
          </div>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
            Intermediate stabilization state. Requires 2 consecutive successful checks to graduate to <strong>ACTIVE</strong>. Any failure reverts to <strong>DISCONNECTED</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
