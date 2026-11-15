import Server from '../models/Server.js';
import MonitoringHistory from '../models/MonitoringHistory.js';
import Alert from '../models/Alert.js';
import { executeServerHealthCheck } from '../services/monitoringService.js';

/**
 * Get aggregated dashboard monitoring overview
 */
export async function getMonitoringStatus(req, res) {
  try {
    const servers = await Server.find();
    const totalServers = servers.length;

    let activeCount = 0;
    let slowCount = 0;
    let disconnectedCount = 0;
    let recoveringCount = 0;
    let totalResponseTime = 0;
    let responsiveServerCount = 0;

    servers.forEach((s) => {
      const status = s.currentStatus || 'ACTIVE';
      if (status === 'ACTIVE') activeCount++;
      else if (status === 'SLOW') slowCount++;
      else if (status === 'DISCONNECTED') disconnectedCount++;
      else if (status === 'RECOVERING') recoveringCount++;

      if (s.lastResponseTime && s.lastResponseTime > 0) {
        totalResponseTime += s.lastResponseTime;
        responsiveServerCount++;
      }
    });

    const averageResponseTime = responsiveServerCount > 0
      ? Math.round(totalResponseTime / responsiveServerCount)
      : 0;

    // Availability calculation: Percentage of reachable servers (ACTIVE + SLOW + RECOVERING)
    const reachableCount = activeCount + slowCount + recoveringCount;
    const overallAvailability = totalServers > 0
      ? Number(((reachableCount / totalServers) * 100).toFixed(1))
      : 100.0;

    // Recent 10 failure alerts
    const recentAlerts = await Alert.find();
    const sortedAlerts = recentAlerts.slice(0, 10);

    // Recent 15 monitoring activity entries
    const recentActivity = await MonitoringHistory.find();
    const sortedActivity = recentActivity.slice(0, 15);

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics: {
        totalServers,
        activeServers: activeCount,
        slowServers: slowCount,
        disconnectedServers: disconnectedCount,
        recoveringServers: recoveringCount,
        overallAvailability,
        averageResponseTime,
      },
      distribution: {
        ACTIVE: activeCount,
        SLOW: slowCount,
        DISCONNECTED: disconnectedCount,
        RECOVERING: recoveringCount,
      },
      recentAlerts: sortedAlerts,
      recentActivity: sortedActivity,
      servers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to compile monitoring status: ${error.message}`,
    });
  }
}

/**
 * Get current monitoring details for a specific server
 */
export async function getServerMonitoringDetails(req, res) {
  try {
    const { serverId } = req.params;
    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found',
      });
    }

    const history = await MonitoringHistory.find({ serverId });
    const alerts = await Alert.find({ serverId });

    return res.json({
      success: true,
      server,
      recentHistory: history.slice(0, 30),
      recentAlerts: alerts.slice(0, 10),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to fetch server monitoring details: ${error.message}`,
    });
  }
}

/**
 * Trigger an immediate on-demand manual health check
 */
export async function triggerManualCheck(req, res) {
  try {
    const { serverId } = req.params;
    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found',
      });
    }

    const io = req.app.get('io');
    const result = await executeServerHealthCheck(server, io);

    return res.json({
      success: true,
      message: `Health check completed for ${server.serverName}`,
      result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Manual check failed: ${error.message}`,
    });
  }
}

/**
 * Get historical health check records for a server with date filtering
 */
export async function getServerHistory(req, res) {
  try {
    const { serverId } = req.params;
    const { startDate, endDate, limit } = req.query;

    const query = { serverId };
    if (startDate || endDate) {
      query.checkedAt = {};
      if (startDate) query.checkedAt.$gte = new Date(startDate);
      if (endDate) query.checkedAt.$lte = new Date(endDate);
    }

    const records = await MonitoringHistory.find(query);
    const maxLimit = parseInt(limit, 10) || 100;
    const sliced = records.slice(0, maxLimit);

    // Compute uptime and latency statistics for this range
    let total = sliced.length;
    let reachable = 0;
    let sumLatency = 0;
    let minLatency = total > 0 ? Infinity : 0;
    let maxLatency = 0;

    sliced.forEach((r) => {
      if (r.isReachable) reachable++;
      if (r.responseTime) {
        sumLatency += r.responseTime;
        if (r.responseTime < minLatency) minLatency = r.responseTime;
        if (r.responseTime > maxLatency) maxLatency = r.responseTime;
      }
    });

    const uptimePercentage = total > 0 ? Number(((reachable / total) * 100).toFixed(2)) : 100;
    const avgLatency = total > 0 ? Math.round(sumLatency / total) : 0;

    return res.json({
      success: true,
      serverId,
      count: sliced.length,
      statistics: {
        totalChecks: total,
        successfulChecks: reachable,
        failedChecks: total - reachable,
        uptimePercentage,
        avgLatency,
        minLatency: minLatency === Infinity ? 0 : minLatency,
        maxLatency,
      },
      history: sliced,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to fetch history: ${error.message}`,
    });
  }
}

export default {
  getMonitoringStatus,
  getServerMonitoringDetails,
  triggerManualCheck,
  getServerHistory,
};
