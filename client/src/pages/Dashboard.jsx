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
  ShieldAlert,
} from 'lucide-react';
import StatCard from '../components/StatCard.jsx';
import ServerTable from '../components/ServerTable.jsx';
import AlertPanel from '../components/AlertPanel.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const STATUS_COLORS = {
  Active: '#22c55e',
  Slow: '#eab308',
  Disconnected: '#ef4444',
  Recovering: '#3b82f6',
};

/**
 * Dashboard Page (Overview Dashboard)
 * Provides comprehensive live telemetry, KPI cards, visual charts,
 * alert summaries, and real-time server health matrix.
 */
export default function Dashboard({
  analyticsData,
  servers = [],
  onCheckServer,
  checkingServerId,
  onNavigate,
  onMarkReadAlert,
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
      {/* 1. Live Statistics Cards Grid */}
      <div className="stats-grid">
        <StatCard
          title="Total Servers"
          value={summary.totalServers}
          subtext="Configured endpoints"
          icon={Server}
          accentColor="#38bdf8"
          onClick={() => onNavigate && onNavigate('servers')}
        />

        <StatCard
          title="Active Servers"
          value={summary.activeServers}
          valueColor="#22c55e"
          subtext="Nominal operation"
          icon={CheckCircle2}
          accentColor="#22c55e"
          badge="HEALTHY"
          onClick={() => onNavigate && onNavigate('servers')}
        />

        <StatCard
          title="Slow Servers"
          value={summary.slowServers}
          valueColor="#eab308"
          subtext="Exceeding threshold"
          icon={AlertTriangle}
          accentColor="#eab308"
          badge={summary.slowServers > 0 ? 'ATTN' : null}
          onClick={() => onNavigate && onNavigate('servers')}
        />

        <StatCard
          title="Disconnected"
          value={summary.disconnectedServers}
          valueColor="#ef4444"
          subtext="Offline or unreachable"
          icon={XCircle}
          accentColor="#ef4444"
          badge={summary.disconnectedServers > 0 ? 'CRITICAL' : null}
          onClick={() => onNavigate && onNavigate('servers')}
        />

        <StatCard
          title="Recovering"
          value={summary.recoveringServers}
          valueColor="#3b82f6"
          subtext="Validating stability"
          icon={RefreshCw}
          accentColor="#3b82f6"
          onClick={() => onNavigate && onNavigate('servers')}
        />

        <StatCard
          title="Overall Uptime"
          value={`${summary.availabilityPercentage}%`}
          valueColor={summary.availabilityPercentage >= 95 ? '#22c55e' : '#eab308'}
          subtext="Cluster availability"
          icon={TrendingUp}
          accentColor="#22c55e"
          onClick={() => onNavigate && onNavigate('analytics')}
        />

        <StatCard
          title="Avg Latency"
          value={`${summary.averageResponseTime}ms`}
          subtext="Across active nodes"
          icon={Clock}
          accentColor="#06b6d4"
          onClick={() => onNavigate && onNavigate('analytics')}
        />
      </div>

      {/* 2. Interactive Charts Section */}
      <div className="charts-grid" style={{ marginTop: '1.5rem' }}>
        {/* Chart A: Server Status Distribution Pie Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Cluster Status Distribution</h3>
              <p className="card-subtitle">Real-time breakdown of FSM classifications</p>
            </div>
            <Activity size={18} style={{ color: '#38bdf8' }} />
          </div>

          <div style={{ height: '260px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || '#38bdf8'}
                      stroke="#0f172a"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div
                          style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #1e293b',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '0.8rem',
                          }}
                        >
                          <div style={{ color: data.color, fontWeight: 'bold' }}>
                            {data.name}: {data.value} server(s)
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1.25rem',
              flexWrap: 'wrap',
              marginTop: '0.5rem',
              fontSize: '0.8rem',
            }}
          >
            {distribution.map((d) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: d.color,
                  }}
                />
                <span style={{ color: '#94a3b8' }}>{d.name}:</span>
                <strong style={{ color: '#f1f5f9' }}>{d.value}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Chart B: Response-Time History Line Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Response-Time History</h3>
              <p className="card-subtitle">Recent health-check latency in milliseconds</p>
            </div>
            <Clock size={18} style={{ color: '#06b6d4' }} />
          </div>

          <div style={{ height: '280px' }}>
            {timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="time"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    unit="ms"
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div
                            style={{
                              backgroundColor: '#0f172a',
                              border: '1px solid #1e293b',
                              padding: '0.5rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                            }}
                          >
                            <div style={{ color: '#94a3b8', marginBottom: '0.2rem' }}>
                              Time: {label}
                            </div>
                            <div style={{ color: '#38bdf8', fontWeight: 'bold' }}>
                              Latency: {payload[0].value}ms
                            </div>
                            {payload[0].payload.state && (
                              <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
                                FSM State: {payload[0].payload.state}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="responseTime"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    dot={{ fill: '#0284c7', r: 3 }}
                    activeDot={{ r: 6, fill: '#38bdf8' }}
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
                Waiting for monitoring telemetry samples...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart C: Server Availability & Latency Bar Chart */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">Server Availability & Latency Profile</h3>
            <p className="card-subtitle">Real-time response time vs. configured latency thresholds</p>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('analytics')}
            className="btn btn-secondary btn-sm"
          >
            <span>Full Analytics</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div style={{ height: '240px' }}>
          {serverMetrics.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={serverMetrics}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  unit="ms"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div
                          style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #1e293b',
                            padding: '0.6rem 0.8rem',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                          }}
                        >
                          <div style={{ fontWeight: 'bold', color: '#f8fafc', marginBottom: '0.25rem' }}>
                            {item.name}
                          </div>
                          <div style={{ color: '#38bdf8' }}>Latency: {item.responseTime}ms</div>
                          <div style={{ color: '#94a3b8' }}>Threshold: {item.threshold}ms</div>
                          <div style={{ marginTop: '0.2rem' }}>State: {item.state}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="responseTime"
                  fill="#38bdf8"
                  radius={[4, 4, 0, 0]}
                >
                  {serverMetrics.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={
                        entry.state === 'DISCONNECTED'
                          ? '#ef4444'
                          : entry.responseTime > entry.threshold
                          ? '#eab308'
                          : '#22c55e'
                      }
                    />
                  ))}
                </Bar>
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
                fontSize: '0.85rem',
              }}
            >
              No server telemetry records available.
            </div>
          )}
        </div>
      </div>

      {/* 3. Server Status Table */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">Server Fleet Status Matrix</h3>
            <p className="card-subtitle">Real-time health classifications updated via Socket.IO</p>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('servers')}
            className="btn btn-secondary btn-sm"
          >
            <span>Manage Servers</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <ServerTable
          servers={servers}
          onCheckServer={onCheckServer}
          checkingServerId={checkingServerId}
          compact={false}
        />
      </div>

      {/* 4. Bottom Grid: Recent Failure Alerts & Recent Monitoring Activity */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem',
          marginTop: '1.5rem',
        }}
      >
        {/* Recent Alerts */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Recent Failure Alerts</h3>
              <p className="card-subtitle">Critical events and outage notifications</p>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('alerts')}
              className="btn btn-secondary btn-sm"
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <AlertPanel
            alerts={recentAlerts}
            onMarkRead={onMarkReadAlert}
            compact={true}
            maxItems={5}
          />
        </div>

        {/* Recent Monitoring & FSM Transition Activity */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Recent FSM Transitions</h3>
              <p className="card-subtitle">State transitions and health events</p>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('fsm')}
              className="btn btn-secondary btn-sm"
            >
              <span>FSM View</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {recentTransitions.length > 0 ? (
              recentTransitions.slice(0, 5).map((trans) => (
                <div
                  key={trans._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'rgba(15, 23, 42, 0.4)',
                    borderRadius: '6px',
                    border: '1px solid #1e293b',
                    fontSize: '0.8rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                      <strong style={{ color: '#f8fafc' }}>{trans.serverName}</strong>
                      <span style={{ color: '#64748b' }}>•</span>
                      <StatusBadge state={trans.previousState} size="small" />
                      <ArrowRight size={12} style={{ color: '#64748b' }} />
                      <StatusBadge state={trans.newState} size="small" />
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                      {trans.reason}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>
                    {new Date(trans.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b', fontSize: '0.85rem' }}>
                No recent state transitions recorded.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
