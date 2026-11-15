import express from 'express';

const router = express.Router();

let flakyCounter = 0;
let overrideState = null; // 'healthy' | 'slow' | 'error' | null

// Fast healthy mock endpoint (< 60ms)
router.get('/healthy', (req, res) => {
  const delay = Math.floor(Math.random() * 40) + 20;
  setTimeout(() => {
    res.json({
      status: 'UP',
      service: 'mock-healthy-node',
      latency: `${delay}ms`,
      timestamp: new Date().toISOString(),
    });
  }, delay);
});

// Slow mock endpoint (> 750ms)
router.get('/slow', (req, res) => {
  const delay = Math.floor(Math.random() * 300) + 750;
  setTimeout(() => {
    res.json({
      status: 'DEGRADED',
      service: 'mock-slow-node',
      latency: `${delay}ms`,
      warning: 'High response latency simulated',
      timestamp: new Date().toISOString(),
    });
  }, delay);
});

// Error / Down mock endpoint
router.get('/error', (req, res) => {
  res.status(500).json({
    status: 'DOWN',
    service: 'mock-failing-node',
    error: 'Internal Server Error (Simulated Outage)',
    timestamp: new Date().toISOString(),
  });
});

// Flaky node for demonstrating RECOVERING state transitions
router.get('/flaky', (req, res) => {
  if (overrideState) {
    if (overrideState === 'error') {
      return res.status(503).json({ status: 'DOWN', override: true });
    }
    if (overrideState === 'slow') {
      return setTimeout(() => res.json({ status: 'SLOW', latency: '850ms' }), 850);
    }
    return res.json({ status: 'UP', override: true });
  }

  flakyCounter++;
  const cycle = flakyCounter % 10;

  // 0, 1, 2: Error (triggers DISCONNECTED)
  // 3: Healthy (triggers RECOVERING check 1)
  // 4: Healthy (triggers RECOVERING check 2)
  // 5: Healthy (triggers ACTIVE check 3 - recovery complete)
  // 6, 7: Healthy
  // 8, 9: Slow (triggers SLOW)
  if (cycle < 3) {
    return res.status(503).json({
      status: 'UNAVAILABLE',
      cycle,
      error: 'Simulated intermittent network outage',
    });
  } else if (cycle >= 8) {
    setTimeout(() => {
      res.json({ status: 'DEGRADED', cycle, latency: '800ms' });
    }, 800);
  } else {
    res.json({
      status: 'UP',
      cycle,
      message: 'Node responding normally',
      timestamp: new Date().toISOString(),
    });
  }
});

// Endpoint to interactively toggle mock server behavior from UI
router.post('/set-state', (req, res) => {
  const { state } = req.body;
  overrideState = state; // 'healthy', 'slow', 'error', or null
  res.json({
    success: true,
    message: `Mock node state set to: ${overrideState || 'default cyclic'}`,
  });
});

export default router;
