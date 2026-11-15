import express from 'express';
import Server from '../models/Server.js';
import MonitoringHistory from '../models/MonitoringHistory.js';
import StateTransition from '../models/StateTransition.js';
import Alert from '../models/Alert.js';
import { FSM_STATES, FSM_TRANSITIONS } from '../services/fsmService.js';

const router = express.Router();

/**
 * GET /api/analytics
 * Computes high-level KPIs, distributions, and system performance metrics
 */
router.get('/', async (req, res, next) => {
  try {
    const servers = await Server.find({});

    const totalServers = servers.length;
    const activeServers = servers.filter((s) => s.currentState === 'ACTIVE').length;
    const slowServers = servers.filter((s) => s.currentState === 'SLOW').length;
    const disconnectedServers = servers.filter((s) => s.currentState === 'DISCONNECTED').length;
    const recoveringServers = servers.filter((s) => s.currentState === 'RECOVERING').length;

    // Overall availability calculation (Active + Slow + Recovering / Total enabled)
    const enabledServers = servers.filter((s) => s.enabled);
    const availableServers = enabledServers.filter((s) => s.currentState !== 'DISCONNECTED');
    const availabilityPercentage =
      enabledServers.length > 0
        ? Number(((availableServers.length / enabledServers.length) * 100).toFixed(1))
        : 100;

    // Average response time across active/slow servers with positive latency
    const measuredServers = servers.filter((s) => s.lastResponseTime && s.lastResponseTime > 0);
    const totalLatency = measuredServers.reduce((sum, s) => sum + s.lastResponseTime, 0);
    const averageResponseTime =
      measuredServers.length > 0 ? Math.round(totalLatency / measuredServers.length) : 0;

    // Status distribution array for Recharts Pie chart
    const distribution = [
      { name: 'Active', value: activeServers, color: '#22c55e' },
      { name: 'Slow', value: slowServers, color: '#eab308' },
      { name: 'Disconnected', value: disconnectedServers, color: '#ef4444' },
      { name: 'Recovering', value: recoveringServers, color: '#3b82f6' },
    ];

    // Server-by-server availability and latency comparison for bar charts
    const serverMetrics = servers.map((s) => ({
      id: s._id,
      name: s.name,
      state: s.currentState,
      responseTime: s.lastResponseTime || 0,
      threshold: s.responseThreshold,
      statusCode: s.lastStatusCode,
      enabled: s.enabled,
    }));

    // Recent 30 monitoring history points for response-time trend line chart
    const recentHistory = await MonitoringHistory.find({})
      .sort({ timestamp: -1 })
      .limit(30);

    // Format for time series
    const timeline = (recentHistory || [])
      .reverse()
      .map((h) => ({
        time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        responseTime: h.responseTime,
        statusCode: h.statusCode,
        state: h.state,
      }));

    // Recent failure alerts
    const recentAlerts = await Alert.find({})
      .sort({ createdAt: -1 })
      .limit(6);

    // Recent state transitions
    const recentTransitions = await StateTransition.find({})
      .sort({ timestamp: -1 })
      .limit(8);

    return res.json({
      success: true,
      data: {
        summary: {
          totalServers,
          activeServers,
          slowServers,
          disconnectedServers,
          recoveringServers,
          availabilityPercentage,
          averageResponseTime,
        },
        distribution,
        serverMetrics,
        timeline,
        recentAlerts,
        recentTransitions,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/fsm/transitions
 * Retrieve transition logs with optional serverId filter
 */
router.get('/transitions', async (req, res, next) => {
  try {
    const { serverId, limit = 50 } = req.query;
    const filter = {};
    if (serverId) filter.serverId = serverId;

    const transitions = await StateTransition.find(filter)
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    return res.json({
      success: true,
      count: transitions.length,
      data: transitions,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/fsm/rules
 * Returns FSM states, transition matrix, and diagrams configuration
 */
router.get('/rules', (req, res) => {
  return res.json({
    success: true,
    states: FSM_STATES,
    transitions: FSM_TRANSITIONS,
  });
});

export default router;
