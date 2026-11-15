import express from 'express';
import Server from '../models/Server.js';
import MonitoringHistory from '../models/MonitoringHistory.js';
import Alert from '../models/Alert.js';
import StateTransition from '../models/StateTransition.js';
import { validateHealthCheckUrl } from '../utils/validator.js';
import {
  registerServer,
  unregisterServer,
  performHealthCheck,
} from '../services/monitoringService.js';

const router = express.Router();

/**
 * GET /api/servers
 * Retrieve all configured servers with optional state or enabled filter
 */
router.get('/', async (req, res, next) => {
  try {
    const { state, enabled } = req.query;
    const filter = {};
    if (state) filter.currentState = state.toUpperCase();
    if (enabled !== undefined) filter.enabled = enabled === 'true';

    const servers = await Server.find(filter);
    return res.json({
      success: true,
      count: servers.length,
      data: servers,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/servers
 * Register a new server to monitor
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, url, description, responseThreshold, monitoringInterval, enabled } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Server name is required.' });
    }

    if (!url || !url.trim()) {
      return res.status(400).json({ success: false, message: 'Health-check URL is required.' });
    }

    // SSRF & URL security validation
    const validation = validateHealthCheckUrl(url);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    const newServer = await Server.create({
      name: name.trim(),
      url: validation.url,
      description: description ? description.trim() : '',
      responseThreshold: responseThreshold ? Number(responseThreshold) : 500,
      monitoringInterval: monitoringInterval ? Number(monitoringInterval) : 10,
      enabled: enabled !== undefined ? Boolean(enabled) : true,
      currentState: 'ACTIVE',
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
    });

    // Record initial transition
    await StateTransition.create({
      serverId: newServer._id,
      serverName: newServer.name,
      previousState: 'INITIAL',
      newState: 'ACTIVE',
      reason: 'Server provisioned and registered in monitoring system.',
      timestamp: new Date(),
    });

    // Register with monitoring scheduler
    const io = req.app.get('io');
    if (newServer.enabled) {
      registerServer(newServer, io);
    }

    if (io) {
      io.emit('server_created', newServer);
    }

    return res.status(201).json({
      success: true,
      message: 'Server registered successfully',
      data: newServer,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/servers/:id
 * Retrieve a single server by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const server = await Server.findById(req.params.id);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }
    return res.json({ success: true, data: server });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/servers/:id
 * Update server configuration
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { name, url, description, responseThreshold, monitoringInterval, enabled } = req.body;
    const server = await Server.findById(req.params.id);

    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    if (url && url !== server.url) {
      const validation = validateHealthCheckUrl(url);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.error });
      }
      server.url = validation.url;
    }

    if (name) server.name = name.trim();
    if (description !== undefined) server.description = description.trim();
    if (responseThreshold !== undefined) server.responseThreshold = Number(responseThreshold);
    if (monitoringInterval !== undefined) server.monitoringInterval = Number(monitoringInterval);
    if (enabled !== undefined) server.enabled = Boolean(enabled);

    const updated = await Server.findByIdAndUpdate(req.params.id, {
      name: server.name,
      url: server.url,
      description: server.description,
      responseThreshold: server.responseThreshold,
      monitoringInterval: server.monitoringInterval,
      enabled: server.enabled,
    });

    const io = req.app.get('io');
    if (server.enabled) {
      registerServer(server, io);
    } else {
      unregisterServer(server._id);
    }

    if (io) {
      io.emit('server_updated', server);
    }

    return res.json({
      success: true,
      message: 'Server configuration updated',
      data: server,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/servers/:id
 * Remove a server from monitoring and clean up records
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const serverId = req.params.id;
    const server = await Server.findById(serverId);

    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    // Stop recurring checks
    unregisterServer(serverId);

    // Delete server
    await Server.findByIdAndDelete(serverId);

    const io = req.app.get('io');
    if (io) {
      io.emit('server_deleted', { serverId });
    }

    return res.json({
      success: true,
      message: `Server '${server.name}' deleted successfully.`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/servers/:id/history
 * Retrieve monitoring history for a specific server
 */
router.get('/:id/history', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const history = await MonitoringHistory.find({ serverId: req.params.id })
      .sort({ timestamp: -1 })
      .limit(limit);

    return res.json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/servers/:id/alerts
 * Retrieve alerts for a specific server
 */
router.get('/:id/alerts', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const alerts = await Alert.find({ serverId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/monitoring/:id/check
 * Trigger an immediate on-demand health check for a server
 */
router.post('/:id/check', async (req, res, next) => {
  try {
    const server = await Server.findById(req.params.id);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Server not found' });
    }

    const io = req.app.get('io');
    const result = await performHealthCheck(server, io);

    return res.json({
      success: true,
      message: 'On-demand health check completed',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
