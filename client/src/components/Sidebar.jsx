import React from 'react';
import {
  LayoutDashboard,
  Server,
  Activity,
  Bell,
  FileText,
  BarChart3,
  GitBranch,
  Settings as SettingsIcon,
  Radio,
} from 'lucide-react';

export default function Sidebar({ currentPage, setCurrentPage, unreadAlertsCount, isConnected }) {
  const navItems = [
    { id: 'overview', label: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'servers', label: 'Server Management', icon: Server },
    { id: 'live', label: 'Live Monitoring', icon: Activity },
    {
      id: 'alerts',
      label: 'Failure Alerts',
      icon: Bell,
      badge: unreadAlertsCount > 0 ? unreadAlertsCount : null,
    },
    { id: 'reports', label: 'Historical Reports', icon: FileText },
    { id: 'analytics', label: 'Performance Analytics', icon: BarChart3 },
    { id: 'fsm', label: 'FSM Visualization', icon: GitBranch },
    { id: 'settings', label: 'Settings & Simulator', icon: SettingsIcon },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-icon">
          <Radio size={20} />
        </div>
        <div>
          <div className="brand-title">ServerPulse</div>
          <div className="brand-subtitle">Distributed Monitor</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`nav-item ${isActive ? 'active' : ''}`}
              style={{ background: 'none', textAlign: 'left', width: '100%' }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="system-status-indicator">
          <span
            className={`pulse-dot ${isConnected ? 'pulse' : ''}`}
            style={{
              backgroundColor: isConnected ? '#22c55e' : '#ef4444',
            }}
          />
          <span>
            {isConnected ? 'Socket.IO: Connected' : 'Socket.IO: Reconnecting...'}
          </span>
        </div>
      </div>
    </aside>
  );
}
