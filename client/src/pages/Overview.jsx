import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import {
  Server,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  TrendingUp,
  Activity,
  ArrowRight,
} from 'lucide-react';
import StateBadge from '../components/StateBadge.jsx';

const STATUS_COLORS = {
  Active: '#22c55e',
  Slow: '#eab308',
  Disconnected: '#ef4444',
  Recovering: '#3b82f6',
};

export default function Overview({
  analyticsData,
  servers,
  onCheckServer,
  checkingServerId,
  onNavigate,
}) {
  const summary = analyticsData?.summary || {
    totalServers: servers.length,
    activeServers: servers.filter((s) => s.currentState === 'ACTIVE').length,
    slowServers: servers.filter((s) => s.currentState === 'SLOW').length,
    disconnectedServers: servers.filter((s) => s.currentState === 'DISCONNECTED').length,
    recoveringServers: servers.filter((s) => s.currentState === 'RECOVERING').length,
    availabilityPercentage: 100,
    averageResponseTime: 0,
  };

  const distribution = analyticsData?.distribution || [
    { name: 'Active', value: summary.activeServers, color: '#22c55e' },
    { name: 'Slow', value: summary.slowServers, color: '#eab308' },
    { name: 'Disconnected', value: summary.disconnectedServers, color: '#ef4444' },
    { name: 'Recovering', value: summary.recoveringServers, color: '#3b82f6' },
  ];

  const timeline = analyticsData?.timeline || [];
  const serverMetrics = analyticsData?.serverMetrics || [];
  const recentAlerts = analyticsData?.recentAlerts || [];
  const recentTransitions = analyticsData?.recentTransitions || [];

  return (
    <div>
      {/* 1. Statistics Cards Grid */}
      <div className="stats-grid">
        <div className="stat-card" style={{ '--card-accent': '#38bdf8' }}>
          <div className="stat-header">
            <span>Total Servers</span>
            <Server size={18} style={{ color: '#38bdf8' }} />
          </div>
          <div className="stat-value">{summary.totalServers}</div>
          <div className="stat-subtext">Configured endpoints</div>
        </div>

        <div className="stat-card" style={{ '--card-accent': '#22c55e' }}>
          <div className="stat-header">
            <span>Active Servers</span>
            <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
          </div>
          <div className="stat-value" style={{ color: '#22c55e' }}>
            {summary.activeServers}
          </div>
          <div className="stat-subtext">Operating normally</div>
        </div>

        <div className="stat-card" style={{ '--card-accent': '#eab308' }}>
          <div className="stat-header">
            <span>Slow Servers</span>
            <AlertTriangle size={18} style={{ color: '#eab308' }} />
          </div>
          <div className="stat-value" style={{ color: '#eab308' }}>
            {summary.slowServers}
          </div>
          <div className="stat-subtext">Latency exceeding threshold</div>
        </div>

        <div className="stat-card" style={{ '--card-accent': '#ef4444' }}>
          <div className="stat-header">
            <span>Disconnected</span>
            <XCircle size={18} style={{ color: '#ef4444' }} />
          </div>
          <div className="stat-value" style={{ color: '#ef4444' }}>
            {summary.disconnectedServers}
          </div>
          <div className="stat-subtext">Unreachable / Failed</div>
        </div>

        <div className="stat-card" style={{ '--card-accent': '#3b82f6' }}>
          <div className="stat-header">
            <span>Recovering</span>
            <RefreshCw size={18} style={{ color: '#3b82f6' }} />
          </div>
          <div className="stat-value" style={{ color: '#3b82f6' }}>
            {summary.recoveringServers}
          </div>
          <div className="stat-subtext">Under verification</div>
        </div>

        <div className="stat-card" style={{ '--card-accent': '#10b981' }}>
          <div className="stat-header">
            <span>Availability</span>
            <TrendingUp size={18} style={{ color: '#10b981' }} />
          </div>
          <div className="stat-value" style={{ color: '#10b981' }}>
            {summary.availabilityPercentage}%
          </div>
          <div className="stat-subtext">Overall uptime ratio</div>
        </div>

        <div className="stat-card" style={{ '--card-accent': '#6366f1' }}>
          <div className="stat-header">
            <span>Avg Response</span>
            <Clock size={18} style={{ color: '#6366f1' }} />
          </div>
          <div className="stat-value font-mono">
            {summary.averageResponseTime}
            <span style={{ fontSize: '0.9rem', color: '#94a3b8', marginLeft: '3px' }}>ms</span>
          </div>
          <div className="stat-subtext">Active latency average</div>
        </div>
      </div>

      {/* 2. Charts Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Status Distribution Donut Chart */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Activity size={18} style={{ color: '#38bdf8' }} />
              Server Status Distribution
            </h2>
          </div>
          <div style={{ height: 240, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                  }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
              marginTop: '0.5rem',
            }}
          >
            {distribution.map((d) => (
              <div
                key={d.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: d.color,
                  }}
                />
                <span>
                  {d.name}: <strong style={{ color: '#fff' }}>{d.value}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Latency Trend Line Chart */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Clock size={18} style={{ color: '#38bdf8' }} />
              Response-Time Trend (Real-time)
            </h2>
          </div>
          <div style={{ height: 240, width: '100%' }}>
            {timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                    }}
                    formatter={(value) => [`${value} ms`, 'Response Time']}
                  />
                  <Line
                    type="monotone"
                    dataKey="responseTime"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={{ r: 2, fill: '#38bdf8' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  fontSize: '0.85rem',
                }}
              >
                Waiting for real-time monitoring samples...
              </div>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', marginTop: '0.5rem' }}>
            Continuous millisecond latency measurements across active health-checks
          </div>
        </div>

        {/* Server Latency & Threshold Comparison Bar Chart */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <TrendingUp size={18} style={{ color: '#38bdf8' }} />
              Server Latency vs Threshold
            </h2>
          </div>
          <div style={{ height: 240, width: '100%' }}>
            {serverMetrics.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serverMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={10}
                    tickFormatter={(val) => (val.length > 10 ? val.substring(0, 10) + '..' : val)}
                  />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                    }}
                  />
                  <Bar dataKey="responseTime" fill="#0ea5e9" name="Latency (ms)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="threshold" fill="#6366f1" name="Threshold (ms)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                }}
              >
                No metrics available
              </div>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', marginTop: '0.5rem' }}>
            Light blue: actual response time | Purple: configured threshold
          </div>
        </div>
      </div>

      {/* 3. Server Status Table */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h2 className="card-title">
            <Server size={18} style={{ color: '#38bdf8' }} />
            Configured Servers Status
          </h2>
          <button
            onClick={() => onNavigate('servers')}
            className="btn btn-secondary btn-sm"
          >
            <span>Manage All</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Server Name</th>
                <th>Target Endpoint</th>
                <th>FSM State</th>
                <th>Latency</th>
                <th>HTTP Status</th>
                <th>Last Checked</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {servers.map((server) => (
                <tr key={server._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{server.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {server.description || 'No description'}
                    </div>
                  </td>
                  <td>
                    <span className="font-mono" style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
                      {server.url}
                    </span>
                  </td>
                  <td>
                    <StateBadge state={server.currentState} />
                  </td>
                  <td>
                    <span
                      className="font-mono"
                      style={{
                        fontWeight: 600,
                        color:
                          server.lastResponseTime > server.responseThreshold
                            ? '#eab308'
                            : '#f8fafc',
                      }}
                    >
                      {server.lastResponseTime ? `${server.lastResponseTime} ms` : '—'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '4px' }}>
                      / {server.responseThreshold}ms
                    </span>
                  </td>
                  <td>
                    {server.lastStatusCode ? (
                      <span
                        className="badge"
                        style={{
                          backgroundColor:
                            server.lastStatusCode >= 200 && server.lastStatusCode < 400
                              ? 'rgba(34, 197, 94, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                          color:
                            server.lastStatusCode >= 200 && server.lastStatusCode < 400
                              ? '#22c55e'
                              : '#ef4444',
                        }}
                      >
                        {server.lastStatusCode}
                      </span>
                    ) : (
                      <span style={{ color: '#64748b' }}>—</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    {server.lastCheckedAt
                      ? new Date(server.lastCheckedAt).toLocaleTimeString()
                      : 'Pending'}
                  </td>
                  <td>
                    <button
                      onClick={() => onCheckServer(server._id)}
                      disabled={checkingServerId === server._id}
                      className="btn btn-secondary btn-sm"
                      title="Trigger health-check now"
                    >
                      <RefreshCw
                        size={12}
                        style={{
                          animation:
                            checkingServerId === server._id
                              ? 'spin 1s linear infinite'
                              : 'none',
                        }}
                      />
                      <span>Check Now</span>
                    </button>
                  </td>
                </tr>
              ))}
              {servers.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No servers configured yet. Navigate to Server Management to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Bottom Activity & Alerts Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Recent Alerts Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <AlertTriangle size={18} style={{ color: '#ef4444' }} />
              Recent Failure Alerts
            </h2>
            <button
              onClick={() => onNavigate('alerts')}
              className="btn btn-secondary btn-sm"
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentAlerts.map((alert) => (
              <div
                key={alert._id}
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '6px',
                  borderLeft: `3px solid ${
                    alert.severity === 'CRITICAL'
                      ? '#ef4444'
                      : alert.severity === 'WARNING'
                      ? '#eab308'
                      : alert.severity === 'SUCCESS'
                      ? '#22c55e'
                      : '#38bdf8'
                  }`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{alert.title}</span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    {new Date(alert.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{alert.message}</div>
              </div>
            ))}
            {recentAlerts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.8rem' }}>
                No active failure alerts recorded.
              </div>
            )}
          </div>
        </div>

        {/* Recent Transitions Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Activity size={18} style={{ color: '#38bdf8' }} />
              Recent FSM State Transitions
            </h2>
            <button
              onClick={() => onNavigate('fsm')}
              className="btn btn-secondary btn-sm"
            >
              <span>FSM Graph</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentTransitions.map((t) => (
              <div
                key={t._id}
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '6px',
                  border: '1px solid #1e293b',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.35rem',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{t.serverName}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <StateBadge state={t.previousState} showDot={false} size="small" />
                    <span style={{ color: '#64748b', fontSize: '0.7rem' }}>→</span>
                    <StateBadge state={t.newState} size="small" />
                  </div>
                </div>
                <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>{t.reason}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.25rem' }}>
                  {new Date(t.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
            {recentTransitions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.8rem' }}>
                No state transitions logged yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
