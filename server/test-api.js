import axios from 'axios';
import { app, server } from './server.js';

async function runTests() {
  console.log('\n======================================================');
  console.log('🚀 RUNNING END-TO-END API & INTEGRATION VERIFICATION');
  console.log('======================================================\n');

  // Wait 1.5s for server initialization
  await new Promise((r) => setTimeout(r, 1500));

  const BASE_URL = 'http://localhost:5000';
  let passed = 0;
  let failed = 0;

  async function check(name, fn) {
    try {
      await fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [FAIL] ${name}:`, err.response?.data || err.message);
      failed++;
    }
  }

  // 1. Health endpoint
  await check('GET /api/health', async () => {
    const res = await axios.get(`${BASE_URL}/api/health`);
    if (res.data.status !== 'online') throw new Error('Status not online');
  });

  // 2. Fetch initial seeded servers
  let initialServers = [];
  await check('GET /api/servers', async () => {
    const res = await axios.get(`${BASE_URL}/api/servers`);
    if (!res.data.success || !Array.isArray(res.data.data)) throw new Error('Invalid response');
    initialServers = res.data.data;
    if (initialServers.length === 0) throw new Error('Expected seeded servers');
  });

  // 3. Register a new server
  let createdServerId = null;
  await check('POST /api/servers (Add new server)', async () => {
    const res = await axios.post(`${BASE_URL}/api/servers`, {
      name: 'Integration Test Node',
      url: 'http://localhost:5000/api/mock/fast',
      description: 'Temporary node for automated test verification',
      responseThreshold: 350,
      monitoringInterval: 5,
      enabled: true,
    });
    if (!res.data.success || !res.data.data._id) throw new Error('Creation failed');
    createdServerId = res.data.data._id;
  });

  // 4. Retrieve single server
  await check('GET /api/servers/:id', async () => {
    const res = await axios.get(`${BASE_URL}/api/servers/${createdServerId}`);
    if (res.data.data.name !== 'Integration Test Node') throw new Error('Name mismatch');
  });

  // 5. Update server
  await check('PUT /api/servers/:id', async () => {
    const res = await axios.put(`${BASE_URL}/api/servers/${createdServerId}`, {
      name: 'Integration Test Node (Renamed)',
      responseThreshold: 450,
    });
    if (res.data.data.name !== 'Integration Test Node (Renamed)') throw new Error('Update failed');
  });

  // 6. Manual On-Demand Health Check
  await check('POST /api/monitoring/:id/check', async () => {
    const res = await axios.post(`${BASE_URL}/api/monitoring/${createdServerId}/check`);
    if (!res.data.success || !res.data.data.checkResult) throw new Error('Check failed');
  });

  // 7. Get server history
  await check('GET /api/servers/:id/history', async () => {
    const res = await axios.get(`${BASE_URL}/api/servers/${createdServerId}/history`);
    if (!res.data.success) throw new Error('Failed to fetch history');
  });

  // 8. Get server alerts
  await check('GET /api/servers/:id/alerts', async () => {
    const res = await axios.get(`${BASE_URL}/api/servers/${createdServerId}/alerts`);
    if (!res.data.success) throw new Error('Failed to fetch server alerts');
  });

  // 9. Get all alerts
  let testAlertId = null;
  await check('GET /api/alerts', async () => {
    const res = await axios.get(`${BASE_URL}/api/alerts`);
    if (!res.data.success) throw new Error('Failed to fetch alerts');
    if (res.data.data.length > 0) {
      testAlertId = res.data.data[0]._id;
    }
  });

  // 10. Mark alert as read (if alert exists)
  if (testAlertId) {
    await check('PATCH /api/alerts/:id/read', async () => {
      const res = await axios.patch(`${BASE_URL}/api/alerts/${testAlertId}/read`);
      if (!res.data.success) throw new Error('Failed to mark alert as read');
    });
  }

  // 11. Performance analytics
  await check('GET /api/analytics', async () => {
    const res = await axios.get(`${BASE_URL}/api/analytics`);
    if (!res.data.success || !res.data.data.summary) throw new Error('Failed analytics');
  });

  // 12. FSM transitions
  await check('GET /api/fsm/transitions', async () => {
    const res = await axios.get(`${BASE_URL}/api/fsm/transitions`);
    if (!res.data.success) throw new Error('Failed transitions');
  });

  // 13. Delete test server
  await check('DELETE /api/servers/:id', async () => {
    const res = await axios.delete(`${BASE_URL}/api/servers/${createdServerId}`);
    if (!res.data.success) throw new Error('Delete failed');
  });

  // 14. Mock routes verification
  await check('GET /api/mock/fast (Nominal response)', async () => {
    const res = await axios.get(`${BASE_URL}/api/mock/fast`);
    if (res.status !== 200) throw new Error('Status not 200');
  });

  await check('GET /api/mock/slow (High latency response)', async () => {
    const res = await axios.get(`${BASE_URL}/api/mock/slow`);
    if (res.status !== 200) throw new Error('Status not 200');
  });

  await check('GET /api/mock/error (503 Service Unavailable)', async () => {
    const res = await axios.get(`${BASE_URL}/api/mock/error`, {
      validateStatus: () => true,
    });
    if (res.status !== 503) throw new Error('Status not 503');
  });

  console.log('\n======================================================');
  console.log(`Final API Test Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  // Close server and exit
  server.close(() => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

runTests();
