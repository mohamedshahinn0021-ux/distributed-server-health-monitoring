import Server from '../models/Server.js';
import MonitoringHistory from '../models/MonitoringHistory.js';
import Alert from '../models/Alert.js';
import { validateServerUrl } from '../utils/responseTime.js';
import { executeServerHealthCheck } from '../services/monitoringService.js';

/**
 * Register a new Server
 */
export async function createServer(req, res) {
  try {
    const {
      serverName,
      serverUrl,
      description,
      monitoringInterval,
      responseTimeThreshold,
    } = req.body;

    if (!serverName || !serverUrl) {
      return res.status(400).json({
        success: false,
        message: 'Server name and server URL are required',
      });
    }

    // SSRF & Protocol Safety Validation
    const urlValidation = validateServerUrl(serverUrl);
    if (!urlValidation.valid) {
      return res.status(400).json({
        success: false,
        message: `Invalid Server URL: ${urlValidation.message}`,
      });
    }

    const interval = Math.max(3, parseInt(monitoringInterval, 10) || 10);
    const threshold = Math.max(20, parseInt(responseTimeThreshold, 10) || 500);

    const newServer = await Server.create({
      serverName: serverName.trim(),
      serverUrl: urlValidation.url,
      description: (description || '').trim(),
      monitoringInterval: interval,
      responseTimeThreshold: threshold,
      currentStatus: 'ACTIVE',
      isMonitoring: true,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastResponseTime: 0,
      lastStatusCode: 0,
      lastCheckedAt: null,
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('server_created', newServer);
    }

    // Trigger initial health check asynchronously
    setTimeout(() => {
      executeServerHealthCheck(newServer._id, io).catch(() => {});
    }, 500);

    return res.status(201).json({
      success: true,
      message: 'Server registered successfully for monitoring',
      server: newServer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to create server: ${error.message}`,
    });
  }
}

/**
 * Retrieve all registered servers with optional filtering
 */
export async function getAllServers(req, res) {
  try {
    const { status, search, isMonitoring } = req.query;
    const query = {};

    if (status) {
      query.currentStatus = status.toUpperCase();
    }

    if (isMonitoring !== undefined) {
      query.isMonitoring = isMonitoring === 'true';
    }

    let servers = await Server.find(query);

    if (search) {
      const q = search.toLowerCase();
      servers = servers.filter(
        (s) =>
          (s.serverName && s.serverName.toLowerCase().includes(q)) ||
          (s.serverUrl && s.serverUrl.toLowerCase().includes(q)) ||
          (s.description && s.description.toLowerCase().includes(q))
      );
    }

    return res.json({
      success: true,
      count: servers.length,
      servers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to fetch servers: ${error.message}`,
    });
  }
}

/**
 * Retrieve a single server by ID
 */
export async function getServerById(req, res) {
  try {
    const server = await Server.findById(req.params.id);
    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found',
      });
    }

    return res.json({
      success: true,
      server,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to fetch server: ${error.message}`,
    });
  }
}

/**
 * Update an existing server
 */
export async function updateServer(req, res) {
  try {
    const {
      serverName,
      serverUrl,
      description,
      monitoringInterval,
      responseTimeThreshold,
      isMonitoring,
    } = req.body;

    const existingServer = await Server.findById(req.params.id);
    if (!existingServer) {
      return res.status(404).json({
        success: false,
        message: 'Server not found',
      });
    }

    const updates = {};
    if (serverName) updates.serverName = serverName.trim();
    if (description !== undefined) updates.description = description.trim();

    if (serverUrl) {
      const urlValidation = validateServerUrl(serverUrl);
      if (!urlValidation.valid) {
        return res.status(400).json({
          success: false,
          message: `Invalid Server URL: ${urlValidation.message}`,
        });
      }
      updates.serverUrl = urlValidation.url;
    }

    if (monitoringInterval !== undefined) {
      updates.monitoringInterval = Math.max(3, parseInt(monitoringInterval, 10) || 10);
    }

    if (responseTimeThreshold !== undefined) {
      updates.responseTimeThreshold = Math.max(20, parseInt(responseTimeThreshold, 10) || 500);
    }

    if (isMonitoring !== undefined) {
      updates.isMonitoring = Boolean(isMonitoring);
    }

    const updated = await Server.findByIdAndUpdate(req.params.id, updates);

    const io = req.app.get('io');
    if (io) {
      io.emit('server_updated', updated);
    }

    return res.json({
      success: true,
      message: 'Server updated successfully',
      server: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to update server: ${error.message}`,
    });
  }
}

/**
 * Toggle Server Monitoring Status (Active / Paused)
 */
export async function toggleServerMonitoring(req, res) {
  try {
    const server = await Server.findById(req.params.id);
    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found',
      });
    }

    const newMonitoringState = !server.isMonitoring;
    const updated = await Server.findByIdAndUpdate(req.params.id, {
      isMonitoring: newMonitoringState,
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('server_updated', updated);
    }

    return res.json({
      success: true,
      message: `Monitoring ${newMonitoringState ? 'resumed' : 'paused'} for ${server.serverName}`,
      server: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to toggle monitoring: ${error.message}`,
    });
  }
}

/**
 * Delete a server and cascade delete related history and alerts
 */
export async function deleteServer(req, res) {
  try {
    const server = await Server.findById(req.params.id);
    if (!server) {
      return res.status(404).json({
        success: false,
        message: 'Server not found',
      });
    }

    await Server.findByIdAndDelete(req.params.id);
    await MonitoringHistory.deleteMany({ serverId: req.params.id });
    await Alert.deleteMany({ serverId: req.params.id });

    const io = req.app.get('io');
    if (io) {
      io.emit('server_deleted', { id: req.params.id, serverName: server.serverName });
    }

    return res.json({
      success: true,
      message: `Server "${server.serverName}" and all associated history/alerts deleted successfully`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to delete server: ${error.message}`,
    });
  }
}

export default {
  createServer,
  getAllServers,
  getServerById,
  updateServer,
  toggleServerMonitoring,
  deleteServer,
};
