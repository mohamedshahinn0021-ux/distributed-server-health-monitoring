import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Filter,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import StateBadge from '../components/StateBadge.jsx';
import { fetchServerHistory } from '../services/api.js';

export default function HistoricalReports({ servers, showToast }) {
  const [selectedServerId, setSelectedServerId] = useState(
    servers[0]?._id || ''
  );
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    if (selectedServerId) {
      loadHistory(selectedServerId);
    }
  }, [selectedServerId]);

  const loadHistory = async (serverId) => {
    setLoading(true);
    try {
      const res = await fetchServerHistory(serverId, { limit: 150 });
      setHistoryRecords(res.data || []);
      setPage(1);
    } catch (err) {
      showToast('Failed to load historical telemetry: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedServer = servers.find((s) => s._id === selectedServerId);

  // Compute metrics from records
  const totalChecks = historyRecords.length;
  const successfulChecks = historyRecords.filter((h) => h.isConnected).length;
  const failureChecks = totalChecks - successfulChecks;
  const uptimeRatio =
    totalChecks > 0 ? ((successfulChecks / totalChecks) * 100).toFixed(1) : '100.0';
  const avgLatency =
    successfulChecks > 0
      ? Math.round(
          historyRecords
            .filter((h) => h.isConnected)
            .reduce((sum, h) => sum + h.responseTime, 0) / successfulChecks
        )
      : 0;

  // Chart data (chronological)
  const chartData = [...historyRecords]
    .reverse()
    .slice(-40)
    .map((h) => ({
      time: new Date(h.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      latency: h.responseTime,
      state: h.state,
    }));

  // Pagination slice
  const totalPages = Math.ceil(historyRecords.length / pageSize) || 1;
  const paginatedRecords = historyRecords.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // CSV Export
  const handleExportCSV = () => {
    if (historyRecords.length === 0) {
      showToast('No records available to export', 'warning');
      return;
    }

    const headers = ['Timestamp', 'Server Name', 'FSM State', 'Response Time (ms)', 'Status Code', 'Connected', 'Error Message'];
    const rows = historyRecords.map((h) => [
      new Date(h.timestamp).toISOString(),
      `"${selectedServer?.name || 'Server'}"`,
      h.state,
      h.responseTime,
      h.statusCode || '',
      h.isConnected,
      `"${(h.errorMessage || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `server_history_${selectedServer?.name.replace(/\s+/g, '_')}_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Exported CSV report successfully', 'success');
  };

  return (
    <div>
      {/* Top Filter Bar */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
          <label className="form-label" style={{ margin: 0 }}>Select Server:</label>
          <select
            value={selectedServerId}
            onChange={(e) => setSelectedServerId(e.target.value)}
            className="form-select"
            style={{ width: 'auto', minWidth: 260 }}
          >
            {servers.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} ({s.currentState})
              </option>
            ))}
          </select>
        </div>

        <button onClick={handleExportCSV} className="btn btn-secondary">
          <Download size={15} style={{ color: '#38bdf8' }} />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* KPI Stats Row for Selected Server */}
      <div className="stats-grid">
        <div className="stat-card" style={{ '--card-accent': '#38bdf8' }}>
          <div className="stat-header">
            <span>Total Recorded Checks</span>
            <FileText size={18} style={{ color: '#38bdf8' }} />
          </div>
          <div className="stat-value">{totalChecks}</div>
          <div className="stat-subtext">Saved in MongoDB</div>
        </div>

        <div className="stat-card" style={{ '--card-accent': '#22c55e' }}>
          <div className="stat-header">
            <span>Successful Checks</span>
            <CheckCircle size={18} style={{ color: '#22c55e' }} />
          </div>
          <div className="stat-value" style={{ color: '#22c55e' }}>
            {successfulChecks}
          </div>
          <div className="stat-subtext">HTTP 2xx/3xx connectivity</div>
        </div>

        <div className="stat-card" style={{ '--card-accent': '#ef4444' }}>
          <div className="stat-header">
            <span>Failed Checks</span>
            <XCircle size={18} style={{ color: '#ef4444' }} />
          </div>
          <div className="stat-value" style={{ color: '#ef4444' }}>
            {failureChecks}
          </div>
          <div className="stat-subtext">Timeout / 5xx / Network</div>
        </div>

        <div className="stat-card" style={{ '--card-accent': '#10b981' }}>
          <div className="stat-header">
            <span>Calculated Uptime</span>
            <Clock size={18} style={{ color: '#10b981' }} />
          </div>
          <div className="stat-value" style={{ color: '#10b981' }}>
            {uptimeRatio}%
          </div>
          <div className="stat-subtext">Historical availability</div>
        </div>

        <div className="stat-card" style={{ '--card-accent': '#6366f1' }}>
          <div className="stat-header">
            <span>Average Latency</span>
            <Clock size={18} style={{ color: '#6366f1' }} />
          </div>
          <div className="stat-value font-mono">
            {avgLatency} <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>ms</span>
          </div>
          <div className="stat-subtext">Mean response duration</div>
        </div>
      </div>

      {/* Latency History Chart */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h2 className="card-title">
            <Clock size={18} style={{ color: '#38bdf8' }} />
            Historical Response Time Curve: {selectedServer?.name}
          </h2>
        </div>
        <div style={{ height: 260, width: '100%' }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                  }}
                  formatter={(val) => [`${val} ms`, 'Latency']}
                />
                <Line
                  type="monotone"
                  dataKey="latency"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#0ea5e9' }}
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
              }}
            >
              {loading ? 'Loading historical data...' : 'No historical data recorded yet.'}
            </div>
          )}
        </div>
      </div>

      {/* Historical Records Table with Pagination */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <FileText size={18} style={{ color: '#38bdf8' }} />
            Detailed Telemetry Audit Log
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
            <span style={{ color: '#94a3b8' }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="btn btn-secondary btn-icon"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="btn btn-secondary btn-icon"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>FSM State</th>
                <th>Response Time</th>
                <th>Status Code</th>
                <th>Connected</th>
                <th>Diagnostic / Error Details</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.map((rec) => (
                <tr key={rec._id}>
                  <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    {new Date(rec.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <StateBadge state={rec.state} size="small" />
                  </td>
                  <td>
                    <span className="font-mono" style={{ fontWeight: 600 }}>
                      {rec.responseTime} ms
                    </span>
                  </td>
                  <td>
                    {rec.statusCode ? (
                      <span
                        className="badge"
                        style={{
                          backgroundColor:
                            rec.statusCode >= 200 && rec.statusCode < 400
                              ? 'rgba(34, 197, 94, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                          color:
                            rec.statusCode >= 200 && rec.statusCode < 400
                              ? '#22c55e'
                              : '#ef4444',
                        }}
                      >
                        {rec.statusCode}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {rec.isConnected ? (
                      <span style={{ color: '#22c55e', fontWeight: 600, fontSize: '0.8rem' }}>
                        ✓ YES
                      </span>
                    ) : (
                      <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.8rem' }}>
                        ✗ NO
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: rec.errorMessage ? '#fca5a5' : '#64748b' }}>
                    {rec.errorMessage || 'Normal operational check passed'}
                  </td>
                </tr>
              ))}
              {paginatedRecords.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No monitoring history entries found for this server.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
