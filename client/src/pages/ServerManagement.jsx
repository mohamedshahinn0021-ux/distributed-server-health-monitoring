import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Info,
  CheckCircle,
  AlertTriangle,
  X,
  Search,
  Filter,
} from 'lucide-react';
import StateBadge from '../components/StateBadge.jsx';

export default function ServerManagement({
  servers,
  onAddServer,
  onUpdateServer,
  onDeleteServer,
  onCheckServer,
  checkingServerId,
  showToast,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState(null);
  const [detailServer, setDetailServer] = useState(null);
  const [deleteConfirmServer, setDeleteConfirmServer] = useState(null);

  // Form states for Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    responseThreshold: 500,
    monitoringInterval: 10,
    enabled: true,
  });

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      url: 'http://localhost:5000/api/mock/fast',
      description: '',
      responseThreshold: 400,
      monitoringInterval: 8,
      enabled: true,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (server) => {
    setEditingServer(server);
    setFormData({
      name: server.name,
      url: server.url,
      description: server.description || '',
      responseThreshold: server.responseThreshold,
      monitoringInterval: server.monitoringInterval,
      enabled: server.enabled,
    });
  };

  const handleToggleEnabled = async (server) => {
    try {
      await onUpdateServer(server._id, {
        enabled: !server.enabled,
      });
      showToast(
        `Monitoring ${!server.enabled ? 'enabled' : 'disabled'} for ${server.name}`,
        'info'
      );
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.url.trim()) {
      showToast('Name and Health-Check URL are required.', 'error');
      return;
    }
    try {
      await onAddServer(formData);
      setIsAddModalOpen(false);
      showToast(`Server "${formData.name}" registered successfully!`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    try {
      await onUpdateServer(editingServer._id, formData);
      setEditingServer(null);
      showToast(`Server "${formData.name}" updated successfully!`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmServer) return;
    try {
      await onDeleteServer(deleteConfirmServer._id);
      showToast(`Server "${deleteConfirmServer.name}" removed.`, 'info');
      setDeleteConfirmServer(null);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Filtered servers
  const filteredServers = servers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesState = stateFilter === 'ALL' || s.currentState === stateFilter;
    return matchesSearch && matchesState;
  });

  return (
    <div>
      {/* Action Header & Filter Controls */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 260 }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 350 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b',
              }}
            />
            <input
              type="text"
              placeholder="Search servers by name or URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2rem' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={15} style={{ color: '#64748b' }} />
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="form-select"
              style={{ width: 'auto', paddingRight: '2rem' }}
            >
              <option value="ALL">All States</option>
              <option value="ACTIVE">Active</option>
              <option value="SLOW">Slow</option>
              <option value="DISCONNECTED">Disconnected</option>
              <option value="RECOVERING">Recovering</option>
            </select>
          </div>
        </div>

        <button onClick={handleOpenAdd} className="btn btn-primary">
          <Plus size={16} />
          <span>Add New Server</span>
        </button>
      </div>

      {/* Servers Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <span>Configured Servers</span>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
              ({filteredServers.length} of {servers.length})
            </span>
          </h2>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Server Details</th>
                <th>Health-Check URL</th>
                <th>Threshold</th>
                <th>Interval</th>
                <th>Enabled</th>
                <th>Last Checked</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredServers.map((server) => (
                <tr key={server._id}>
                  <td>
                    <StateBadge state={server.currentState} />
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{server.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {server.description || 'No description provided'}
                    </div>
                  </td>
                  <td>
                    <span className="font-mono" style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
                      {server.url}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono">{server.responseThreshold} ms</span>
                  </td>
                  <td>
                    <span className="font-mono">{server.monitoringInterval} s</span>
                  </td>
                  <td>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={server.enabled}
                        onChange={() => handleToggleEnabled(server)}
                      />
                      <span className="slider"></span>
                    </label>
                  </td>
                  <td style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {server.lastCheckedAt
                      ? new Date(server.lastCheckedAt).toLocaleTimeString()
                      : 'Never'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        onClick={() => setDetailServer(server)}
                        className="btn btn-secondary btn-icon"
                        title="View details"
                      >
                        <Info size={14} />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(server)}
                        className="btn btn-secondary btn-icon"
                        title="Edit server"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => onCheckServer(server._id)}
                        disabled={checkingServerId === server._id}
                        className="btn btn-secondary btn-icon"
                        title="Test now"
                      >
                        <RefreshCw
                          size={14}
                          style={{
                            animation:
                              checkingServerId === server._id
                                ? 'spin 1s linear infinite'
                                : 'none',
                          }}
                        />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmServer(server)}
                        className="btn btn-danger btn-icon"
                        title="Delete server"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredServers.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                    No servers match your current search or state filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Server Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Register New Server</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="btn btn-secondary btn-icon"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmitAdd}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Server Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Auth Microservice, US-East Gateway"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Health-Check URL *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://api.example.com/health or http://localhost:5000/api/mock/fast"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="form-input font-mono"
                  />
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>
                    Tip: Use built-in mock endpoints (<code>http://localhost:5000/api/mock/fast</code>, <code>/slow</code>, <code>/error</code>, <code>/dynamic</code>) for safe testing.
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of the server role..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="form-textarea"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Response Threshold (ms)</label>
                    <input
                      type="number"
                      min={50}
                      max={10000}
                      value={formData.responseThreshold}
                      onChange={(e) =>
                        setFormData({ ...formData, responseThreshold: Number(e.target.value) })
                      }
                      className="form-input font-mono"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Interval (seconds)</label>
                    <input
                      type="number"
                      min={2}
                      max={3600}
                      value={formData.monitoringInterval}
                      onChange={(e) =>
                        setFormData({ ...formData, monitoringInterval: Number(e.target.value) })
                      }
                      className="form-input font-mono"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    />
                    <span className="slider"></span>
                  </label>
                  <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Enable immediate monitoring</span>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Register Server
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Server Modal */}
      {editingServer && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Edit Server Configuration</h3>
              <button
                onClick={() => setEditingServer(null)}
                className="btn btn-secondary btn-icon"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmitEdit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Server Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Health-Check URL</label>
                  <input
                    type="url"
                    required
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="form-input font-mono"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="form-textarea"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Response Threshold (ms)</label>
                    <input
                      type="number"
                      min={50}
                      max={10000}
                      value={formData.responseThreshold}
                      onChange={(e) =>
                        setFormData({ ...formData, responseThreshold: Number(e.target.value) })
                      }
                      className="form-input font-mono"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Interval (seconds)</label>
                    <input
                      type="number"
                      min={2}
                      max={3600}
                      value={formData.monitoringInterval}
                      onChange={(e) =>
                        setFormData({ ...formData, monitoringInterval: Number(e.target.value) })
                      }
                      className="form-input font-mono"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    />
                    <span className="slider"></span>
                  </label>
                  <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Monitoring active</span>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setEditingServer(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Server Details Modal */}
      {detailServer && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Server Telemetry & Diagnostics</h3>
              <button
                onClick={() => setDetailServer(null)}
                className="btn btn-secondary btn-icon"
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{detailServer.name}</span>
                <StateBadge state={detailServer.currentState} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: '#0f172a', borderRadius: '6px' }}>
                  <div style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase' }}>Target URL</div>
                  <div className="font-mono" style={{ color: '#38bdf8', wordBreak: 'break-all' }}>
                    {detailServer.url}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', backgroundColor: '#0f172a', borderRadius: '6px' }}>
                    <div style={{ color: '#64748b', fontSize: '0.7rem' }}>LAST LATENCY</div>
                    <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                      {detailServer.lastResponseTime} ms
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: '#0f172a', borderRadius: '6px' }}>
                    <div style={{ color: '#64748b', fontSize: '0.7rem' }}>LAST STATUS</div>
                    <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                      {detailServer.lastStatusCode || 'N/A'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', backgroundColor: '#0f172a', borderRadius: '6px' }}>
                    <div style={{ color: '#64748b', fontSize: '0.7rem' }}>CONSECUTIVE FAILURES</div>
                    <div className="font-mono" style={{ color: '#ef4444', fontWeight: 700 }}>
                      {detailServer.consecutiveFailures || 0}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: '#0f172a', borderRadius: '6px' }}>
                    <div style={{ color: '#64748b', fontSize: '0.7rem' }}>CONSECUTIVE SUCCESSES</div>
                    <div className="font-mono" style={{ color: '#22c55e', fontWeight: 700 }}>
                      {detailServer.consecutiveSuccesses || 0}
                    </div>
                  </div>
                </div>

                {detailServer.lastErrorMessage && (
                  <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '6px' }}>
                    <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>Last Error Diagnostic</div>
                    <div style={{ color: '#fca5a5', fontSize: '0.8rem' }}>{detailServer.lastErrorMessage}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setDetailServer(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmServer && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#ef4444' }}>
                Confirm Deletion
              </h3>
              <button
                onClick={() => setDeleteConfirmServer(null)}
                className="btn btn-secondary btn-icon"
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Are you sure you want to delete server{' '}
                <strong style={{ color: '#fff' }}>"{deleteConfirmServer.name}"</strong>?
              </p>
              <p style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                All historical monitoring records and alert logs for this server will be cleaned up.
              </p>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setDeleteConfirmServer(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button onClick={handleConfirmDelete} className="btn btn-danger">
                Delete Server
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
