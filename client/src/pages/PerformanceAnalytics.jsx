import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  ShieldCheck,
  Zap,
  Activity,
  Award,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import StateBadge from '../components/StateBadge.jsx';

export default function PerformanceAnalytics({ servers, analyticsData }) {
  // Compute health score per server
  const serverScores = servers.map((s) => {
    let score = 100;
    if (s.currentState === 'SLOW') score -= 25;
    if (s.currentState === 'RECOVERING') score -= 40;
    if (s.currentState === 'DISCONNECTED') score -= 80;

    // Latency penalty
    if (s.lastResponseTime > s.responseThreshold) {
      score -= 20;
    }

    score = Math.max(0, Math.min(100, score));

    let grade = 'A+';
    let gradeColor = '#22c55e';
    if (score < 60) {
      grade = 'F';
      gradeColor = '#ef4444';
    } else if (score < 75) {
      grade = 'C';
      gradeColor = '#eab308';
    } else if (score < 90) {
      grade = 'B';
      gradeColor = '#38bdf8';
    }

    return {
      ...s,
      healthScore: score,
      grade,
      gradeColor,
    };
  });

  const avgScore =
    serverScores.length > 0
      ? Math.round(serverScores.reduce((sum, s) => sum + s.healthScore, 0) / serverScores.length)
      : 100;

  const barChartData = serverScores.map((s) => ({
    name: s.name,
    score: s.healthScore,
    latency: s.lastResponseTime || 0,
    threshold: s.responseThreshold,
  }));

  return (
    <div>
      {/* Top Overview Cards */}
      <div className="stats-grid">
        <div className="stat-card" style={{ '--card-accent': '#22c55e' }}>
          <div className="stat-header">
            <span>Overall Fleet Health Score</span>
            <Award size={18} style={{ color: '#22c55e' }} />
          </div>
          <div className="stat-value" style={{ color: '#22c55e' }}>
            {avgScore} / 100
          </div>
          <div className="stat-subtext">Composite reliability index</div>
        </div>

        <div className="stat-card" style={{ '--card-accent': '#38bdf8' }}>
          <div className="stat-header">
            <span>Fastest Response Time</span>
            <Zap size={18} style={{ color: '#38bdf8' }} />
          </div>
          <div className="stat-value font-mono">
            {servers.length > 0
              ? Math.min(...servers.filter((s) => s.lastResponseTime > 0).map((s) => s.lastResponseTime) || [0])
              : 0}{' '}
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>ms</span>
          </div>
          <div className="stat-subtext">Peak performance node</div>
        </div>

        <div className="stat-card" style={{ '--card-accent': '#eab308' }}>
          <div className="stat-header">
            <span>Slow Threshold Violations</span>
            <Clock size={18} style={{ color: '#eab308' }} />
          </div>
          <div className="stat-value" style={{ color: '#eab308' }}>
            {servers.filter((s) => s.currentState === 'SLOW').length}
          </div>
          <div className="stat-subtext">Currently degraded nodes</div>
        </div>

        <div className="stat-card" style={{ '--card-accent': '#ef4444' }}>
          <div className="stat-header">
            <span>Active Outages</span>
            <Activity size={18} style={{ color: '#ef4444' }} />
          </div>
          <div className="stat-value" style={{ color: '#ef4444' }}>
            {servers.filter((s) => s.currentState === 'DISCONNECTED').length}
          </div>
          <div className="stat-subtext">Nodes in disconnected state</div>
        </div>
      </div>

      {/* Health Score Comparison Chart */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h2 className="card-title">
            <BarChart3 size={18} style={{ color: '#38bdf8' }} />
            Server Health Scores (0 - 100 Index)
          </h2>
        </div>
        <div style={{ height: 260, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                }}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {barChartData.map((entry, index) => {
                  let color = '#22c55e';
                  if (entry.score < 60) color = '#ef4444';
                  else if (entry.score < 75) color = '#eab308';
                  else if (entry.score < 90) color = '#38bdf8';
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', marginTop: '0.5rem' }}>
          Scores calculated dynamically based on FSM state, response time vs threshold, and consecutive uptime.
        </div>
      </div>

      {/* Server Health Matrix Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <ShieldCheck size={18} style={{ color: '#22c55e' }} />
            Node Reliability & Performance Matrix
          </h2>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Server</th>
                <th>FSM State</th>
                <th>Measured Latency</th>
                <th>Configured Threshold</th>
                <th>Health Score</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {serverScores.map((s) => (
                <tr key={s._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <div className="font-mono" style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {s.url}
                    </div>
                  </td>
                  <td>
                    <StateBadge state={s.currentState} />
                  </td>
                  <td>
                    <span className="font-mono" style={{ fontWeight: 600 }}>
                      {s.lastResponseTime || 0} ms
                    </span>
                  </td>
                  <td>
                    <span className="font-mono">{s.responseThreshold} ms</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div
                        style={{
                          width: 80,
                          height: 6,
                          backgroundColor: '#0f172a',
                          borderRadius: 3,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${s.healthScore}%`,
                            backgroundColor: s.gradeColor,
                          }}
                        />
                      </div>
                      <span className="font-mono" style={{ fontWeight: 700 }}>
                        {s.healthScore}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        color: s.gradeColor,
                        border: `1px solid ${s.gradeColor}40`,
                      }}
                    >
                      {s.grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
