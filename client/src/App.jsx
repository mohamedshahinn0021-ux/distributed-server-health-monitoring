import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import Toast from './components/Toast.jsx';

import Dashboard from './pages/Dashboard.jsx';
import Servers from './pages/Servers.jsx';
import Monitoring from './pages/Monitoring.jsx';
import Alerts from './pages/Alerts.jsx';
import History from './pages/History.jsx';
import Analytics from './pages/Analytics.jsx';
import FSM from './pages/FSM.jsx';
import Settings from './pages/Settings.jsx';

import {
  socket,
  fetchServers,
  fetchAnalytics,
  fetchAlerts,
  createServer,
  updateServer,
  deleteServer,
  triggerServerCheck,
  markAlertAsRead,
  markAllAlertsAsRead,
  deleteAlert,
} from './services/api.js';

export default function App() {
  const [currentPage, setCurrentPage] = useState('overview');
  const [servers, setServers] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [livePings, setLivePings] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [checkingServerId, setCheckingServerId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [isConnected, setIsConnected] = useState(socket.connected);

  // Toast Helper
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 4);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initial Data Fetch
  const refreshAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [serversRes, analyticsRes, alertsRes] = await Promise.all([
        fetchServers(),
        fetchAnalytics(),
        fetchAlerts({ limit: 80 }),
      ]);

      if (serversRes.success) setServers(serversRes.data || []);
      if (analyticsRes.success) setAnalyticsData(analyticsRes.data);
      if (alertsRes.success) setAlerts(alertsRes.data || []);
    } catch (err) {
      console.error('Error fetching dashboard telemetry:', err);
      showToast('Could not reach backend API. Retrying...', 'warning');
    } finally {
      setIsRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Socket.IO Real-time Events
  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      showToast('Connected to live Socket.IO stream', 'success');
    };

    const onDisconnect = () => {
      setIsConnected(false);
      showToast('Socket.IO connection disconnected', 'error');
    };

    const onMonitoringResult = (payload) => {
      // 1. Update live ping buffer (keep latest 40)
      setLivePings((prev) => [payload, ...prev.slice(0, 39)]);

      // 2. Update specific server's latest metrics in state
      setServers((prev) =>
        prev.map((s) => {
          if (s._id === payload.serverId) {
            return {
              ...s,
              currentState: payload.currentState,
              lastResponseTime: payload.responseTime,
              lastStatusCode: payload.statusCode,
              lastCheckedAt: payload.timestamp,
              lastErrorMessage: payload.errorMessage,
            };
          }
          return s;
        })
      );

      // 3. Update summary metrics in analyticsData
      setAnalyticsData((prev) => {
        if (!prev) return prev;
        const newTimelinePoint = {
          time: new Date(payload.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          responseTime: payload.responseTime,
          statusCode: payload.statusCode,
          state: payload.currentState,
        };
        const updatedTimeline = [...(prev.timeline || []).slice(-29), newTimelinePoint];
        return {
          ...prev,
          timeline: updatedTimeline,
        };
      });
    };

    const onServerStatusChanged = (payload) => {
      showToast(
        `[FSM Transition] ${payload.serverName}: ${payload.previousState} → ${payload.currentState}`,
        payload.currentState === 'DISCONNECTED'
          ? 'error'
          : payload.currentState === 'SLOW'
          ? 'warning'
          : payload.currentState === 'ACTIVE'
          ? 'success'
          : 'info'
      );
      // Soft refresh analytics summary
      fetchAnalytics().then((res) => {
        if (res.success) setAnalyticsData(res.data);
      });
    };

    const onNewAlert = (newAlert) => {
      setAlerts((prev) => [newAlert, ...prev]);
      showToast(`Alert: ${newAlert.title}`, newAlert.severity.toLowerCase());
    };

    const onServerCreated = (newServer) => {
      setServers((prev) => [...prev, newServer]);
    };

    const onServerUpdated = (updated) => {
      setServers((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
    };

    const onServerDeleted = ({ serverId }) => {
      setServers((prev) => prev.filter((s) => s._id !== serverId));
    };

    const onAlertMarkedRead = ({ alertId }) => {
      setAlerts((prev) =>
        prev.map((a) => (a._id === alertId ? { ...a, isRead: true } : a))
      );
    };

    const onAllAlertsRead = () => {
      setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('monitoring_result', onMonitoringResult);
    socket.on('server_status_changed', onServerStatusChanged);
    socket.on('new_alert', onNewAlert);
    socket.on('server_created', onServerCreated);
    socket.on('server_updated', onServerUpdated);
    socket.on('server_deleted', onServerDeleted);
    socket.on('alert_marked_read', onAlertMarkedRead);
    socket.on('all_alerts_read', onAllAlertsRead);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('monitoring_result', onMonitoringResult);
      socket.off('server_status_changed', onServerStatusChanged);
      socket.off('new_alert', onNewAlert);
      socket.off('server_created', onServerCreated);
      socket.off('server_updated', onServerUpdated);
      socket.off('server_deleted', onServerDeleted);
      socket.off('alert_marked_read', onAlertMarkedRead);
      socket.off('all_alerts_read', onAllAlertsRead);
    };
  }, [showToast]);

  // Server Actions
  const handleCheckServer = async (id) => {
    setCheckingServerId(id);
    try {
      const res = await triggerServerCheck(id);
      showToast(
        `Check complete: ${res.data?.server?.currentState} (${res.data?.checkResult?.responseTime}ms)`,
        'info'
      );
    } catch (err) {
      showToast('Manual check failed: ' + err.message, 'error');
    } finally {
      setCheckingServerId(null);
    }
  };

  const handleAddServer = async (serverData) => {
    const res = await createServer(serverData);
    if (res.success) {
      setServers((prev) => [...prev, res.data]);
    }
    return res;
  };

  const handleUpdateServer = async (id, serverData) => {
    const res = await updateServer(id, serverData);
    if (res.success) {
      setServers((prev) => prev.map((s) => (s._id === id ? res.data : s)));
    }
    return res;
  };

  const handleDeleteServer = async (id) => {
    const res = await deleteServer(id);
    if (res.success) {
      setServers((prev) => prev.filter((s) => s._id !== id));
    }
    return res;
  };

  const handleMarkAlertRead = async (id) => {
    await markAlertAsRead(id);
    setAlerts((prev) =>
      prev.map((a) => (a._id === id ? { ...a, isRead: true } : a))
    );
  };

  const handleMarkAllAlertsRead = async () => {
    await markAllAlertsAsRead();
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
    showToast('All alerts marked as read', 'info');
  };

  const handleDeleteAlert = async (id) => {
    await deleteAlert(id);
    setAlerts((prev) => prev.filter((a) => a._id !== id));
    showToast('Alert removed', 'info');
  };

  const unreadAlertsCount = alerts.filter((a) => !a.isRead).length;

  const pageHeaders = {
    overview: {
      title: 'Overview Dashboard',
      description: 'Distributed Server Fleet Monitoring & Real-time Finite-State Telemetry',
    },
    servers: {
      title: 'Server Management',
      description: 'Configure and administer HTTP/HTTPS health-check destinations and thresholds',
    },
    live: {
      title: 'Live Telemetry Stream',
      description: 'Full-duplex WebSocket monitor reporting live ping responses and active node state',
    },
    alerts: {
      title: 'Failure Alerts & Incident Center',
      description: 'Real-time notifications for outages, latency threshold breaches, and recoveries',
    },
    reports: {
      title: 'Historical Monitoring Reports',
      description: 'Time-series telemetry audit logs, uptime percentages, and CSV data export',
    },
    analytics: {
      title: 'Performance Analytics',
      description: 'Server reliability index, latency comparisons, and health score grading',
    },
    fsm: {
      title: 'Finite-State Machine (FSM) Visualization',
      description: 'Interactive state transition graph showing real-time state machine evaluations',
    },
    settings: {
      title: 'System Settings & Safe Test Simulator',
      description: 'Harness to trigger normal, slow, outage, and recovery conditions on-the-fly',
    },
  };

  return (
    <div className="app-container">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        unreadAlertsCount={unreadAlertsCount}
        isConnected={isConnected}
      />

      <div className="main-wrapper">
        <Header
          title={pageHeaders[currentPage]?.title || 'Dashboard'}
          description={pageHeaders[currentPage]?.description || ''}
          onRefresh={refreshAllData}
          isRefreshing={isRefreshing}
          onOpenQuickTest={() => setCurrentPage('settings')}
          isConnected={isConnected}
        />

        <main className="content-body">
          {currentPage === 'overview' && (
            <Dashboard
              analyticsData={analyticsData}
              servers={servers}
              onCheckServer={handleCheckServer}
              checkingServerId={checkingServerId}
              onNavigate={setCurrentPage}
            />
          )}

          {currentPage === 'servers' && (
            <Servers
              servers={servers}
              onAddServer={handleAddServer}
              onUpdateServer={handleUpdateServer}
              onDeleteServer={handleDeleteServer}
              onCheckServer={handleCheckServer}
              checkingServerId={checkingServerId}
              showToast={showToast}
            />
          )}

          {currentPage === 'live' && (
            <Monitoring
              servers={servers}
              livePings={livePings}
              onCheckServer={handleCheckServer}
              checkingServerId={checkingServerId}
              isConnected={isConnected}
            />
          )}

          {currentPage === 'alerts' && (
            <Alerts
              alerts={alerts}
              onMarkRead={handleMarkAlertRead}
              onMarkAllRead={handleMarkAllAlertsRead}
              onDeleteAlert={handleDeleteAlert}
              showToast={showToast}
            />
          )}

          {currentPage === 'reports' && (
            <History
              servers={servers}
              showToast={showToast}
            />
          )}

          {currentPage === 'analytics' && (
            <Analytics
              servers={servers}
              analyticsData={analyticsData}
            />
          )}

          {currentPage === 'fsm' && (
            <FSM
              servers={servers}
              onCheckServer={handleCheckServer}
              checkingServerId={checkingServerId}
            />
          )}

          {currentPage === 'settings' && (
            <Settings
              showToast={showToast}
              onRefreshData={refreshAllData}
            />
          )}
        </main>
      </div>

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
