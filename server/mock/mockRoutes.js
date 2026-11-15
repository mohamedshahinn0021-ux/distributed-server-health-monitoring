import express from 'express';

const router = express.Router();

// Mock simulator state to dynamically simulate different server behaviors
const mockServerState = {
  dynamicStatus: 200,
  dynamicDelay: 80,
  dynamicError: false,
};

/**
 * GET /api/mock/fast
 * Returns 200 OK within 50-90ms (ACTIVE state test)
 */
router.get('/fast', async (req, res) => {
  const delay = Math.floor(Math.random() * 40) + 50;
  await new Promise((resolve) => setTimeout(resolve, delay));
  return res.status(200).json({
    status: 'healthy',
    message: 'Primary Gateway operating normally',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * GET /api/mock/slow
 * Returns 200 OK after 750-1200ms (SLOW state test, exceeds default 500ms threshold)
 */
router.get('/slow', async (req, res) => {
  const delay = Math.floor(Math.random() * 450) + 750;
  await new Promise((resolve) => setTimeout(resolve, delay));
  return res.status(200).json({
    status: 'degraded',
    message: 'Database Replica is experiencing high query latency',
    latencyMs: delay,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/mock/error
 * Returns 503 Service Unavailable (DISCONNECTED state test)
 */
router.get('/error', (req, res) => {
  return res.status(503).json({
    status: 'error',
    message: 'Service Unavailable: Connection to upstream microservice failed',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/mock/timeout
 * Delays for 7 seconds to trigger client-side health check timeout
 */
router.get('/timeout', async (req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 7000));
  return res.status(504).json({
    status: 'gateway_timeout',
    message: 'Upstream timed out',
  });
});

/**
 * GET /api/mock/dynamic
 * Responds according to configurable simulator state
 */
router.get('/dynamic', async (req, res) => {
  if (mockServerState.dynamicDelay > 0) {
    await new Promise((resolve) => setTimeout(resolve, mockServerState.dynamicDelay));
  }
  if (mockServerState.dynamicError) {
    return res.status(mockServerState.dynamicStatus || 500).json({
      status: 'error',
      message: 'Simulated Dynamic Outage',
      timestamp: new Date().toISOString(),
    });
  }
  return res.status(mockServerState.dynamicStatus || 200).json({
    status: 'healthy',
    message: 'Dynamic Server Simulator running',
    state: mockServerState,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/mock/simulator/set
 * Set dynamic mock behavior on the fly from UI
 */
router.post('/simulator/set', (req, res) => {
  const { status, delay, error } = req.body;
  if (status !== undefined) mockServerState.dynamicStatus = Number(status);
  if (delay !== undefined) mockServerState.dynamicDelay = Number(delay);
  if (error !== undefined) mockServerState.dynamicError = Boolean(error);

  return res.json({
    success: true,
    message: 'Mock server state updated',
    currentState: mockServerState,
  });
});

/**
 * GET /api/mock/simulator/state
 * Get current dynamic simulator settings
 */
router.get('/simulator/state', (req, res) => {
  return res.json(mockServerState);
});

export default router;
