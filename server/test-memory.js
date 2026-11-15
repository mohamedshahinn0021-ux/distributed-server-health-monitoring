import http from 'http';
import { Socket } from 'net';
import { app, server } from './server.js';

function invokeApp(app, { method = 'GET', url, body = null, headers = {} }) {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    const req = new http.IncomingMessage(socket);
    req.method = method;
    req.url = url;
    req.originalUrl = url;
    req.ip = '127.0.0.1';
    req.connection = socket;
    req.socket = socket;
    Object.defineProperty(socket, 'remoteAddress', { value: '127.0.0.1' });

    const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;

    req.headers = {
      'content-type': 'application/json',
      host: 'localhost:5000',
      ...(payload ? { 'content-length': Buffer.byteLength(payload).toString() } : {}),
      ...headers,
    };

    const res = new http.ServerResponse(req);
    res.assignSocket(socket);

    let resBody = '';

    res.write = (chunk) => {
      if (chunk) resBody += chunk.toString();
      return true;
    };

    res.end = (chunk) => {
      if (chunk) resBody += chunk.toString();
      let parsed = resBody;
      try {
        parsed = JSON.parse(resBody);
      } catch (e) {}
      resolve({ status: res.statusCode, data: parsed, headers: res.getHeaders() });
    };

    if (payload) {
      req.push(payload);
    }
    req.push(null);

    // Forward to app
    app.handle(req, res, (err) => {
      if (err) reject(err);
      else resolve({ status: 404, data: { message: 'Not found' } });
    });
  });
}

async function runMemorySuite() {
  console.log('\n======================================================');
  console.log('⚡ TESTING ALL EXPRESS API ROUTES (IN-PROCESS)');
  console.log('======================================================\n');

  await new Promise((r) => setTimeout(r, 1200));

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. GET /api/health
  await test('GET /api/health', async () => {
    const res = await invokeApp(app, { method: 'GET', url: '/api/health' });
    if (res.status !== 200 || res.data.status !== 'online') {
      throw new Error(`Expected 200 online, got ${res.status}: ${JSON.stringify(res.data)}`);
    }
  });

  // 2. GET /api/servers
  await test('GET /api/servers', async () => {
    const res = await invokeApp(app, { method: 'GET', url: '/api/servers' });
    if (res.status !== 200 || !res.data.success || !Array.isArray(res.data.data)) {
      throw new Error(`Failed: ${JSON.stringify(res.data)}`);
    }
  });

  // 3. POST /api/servers
  let newCreatedId = null;
  await test('POST /api/servers', async () => {
    const res = await invokeApp(app, {
      method: 'POST',
      url: '/api/servers',
      body: {
        name: 'In-Memory Test Ingress',
        url: 'http://localhost:5000/api/mock/fast',
        description: 'Mock node for automated validation',
        responseThreshold: 300,
        monitoringInterval: 5,
        enabled: true,
      },
    });
    if (res.status !== 201 || !res.data.success || !res.data.data._id) {
      throw new Error(`Failed: ${res.status} ${JSON.stringify(res.data)}`);
    }
    newCreatedId = res.data.data._id;
  });

  // 4. GET /api/servers/:id
  await test('GET /api/servers/:id', async () => {
    const res = await invokeApp(app, { method: 'GET', url: `/api/servers/${newCreatedId}` });
    if (res.status !== 200 || res.data.data?.name !== 'In-Memory Test Ingress') {
      throw new Error(`Failed: ${JSON.stringify(res.data)}`);
    }
  });

  // 5. PUT /api/servers/:id
  await test('PUT /api/servers/:id', async () => {
    const res = await invokeApp(app, {
      method: 'PUT',
      url: `/api/servers/${newCreatedId}`,
      body: {
        name: 'In-Memory Test Ingress (Updated)',
        responseThreshold: 450,
      },
    });
    if (res.status !== 200 || res.data.data?.name !== 'In-Memory Test Ingress (Updated)') {
      throw new Error(`Failed: ${JSON.stringify(res.data)}`);
    }
  });

  // 6. GET /api/servers/:id/history
  await test('GET /api/servers/:id/history', async () => {
    const res = await invokeApp(app, { method: 'GET', url: `/api/servers/${newCreatedId}/history` });
    if (res.status !== 200 || !res.data.success) {
      throw new Error(`Failed: ${JSON.stringify(res.data)}`);
    }
  });

  // 7. GET /api/servers/:id/alerts
  await test('GET /api/servers/:id/alerts', async () => {
    const res = await invokeApp(app, { method: 'GET', url: `/api/servers/${newCreatedId}/alerts` });
    if (res.status !== 200 || !res.data.success) {
      throw new Error(`Failed: ${JSON.stringify(res.data)}`);
    }
  });

  // 8. GET /api/alerts
  let alertIdToRead = null;
  await test('GET /api/alerts', async () => {
    const res = await invokeApp(app, { method: 'GET', url: '/api/alerts' });
    if (res.status !== 200 || !res.data.success) {
      throw new Error(`Failed: ${JSON.stringify(res.data)}`);
    }
    if (res.data.data && res.data.data.length > 0) {
      alertIdToRead = res.data.data[0]._id;
    }
  });

  // 9. PATCH /api/alerts/:id/read
  if (alertIdToRead) {
    await test('PATCH /api/alerts/:id/read', async () => {
      const res = await invokeApp(app, { method: 'PATCH', url: `/api/alerts/${alertIdToRead}/read` });
      if (res.status !== 200 || !res.data.success) {
        throw new Error(`Failed: ${JSON.stringify(res.data)}`);
      }
    });
  }

  // 10. GET /api/analytics
  await test('GET /api/analytics', async () => {
    const res = await invokeApp(app, { method: 'GET', url: '/api/analytics' });
    if (res.status !== 200 || !res.data.success || !res.data.data.summary) {
      throw new Error(`Failed: ${JSON.stringify(res.data)}`);
    }
  });

  // 11. GET /api/fsm/transitions
  await test('GET /api/fsm/transitions', async () => {
    const res = await invokeApp(app, { method: 'GET', url: '/api/fsm/transitions' });
    if (res.status !== 200 || !res.data.success) {
      throw new Error(`Failed: ${JSON.stringify(res.data)}`);
    }
  });

  // 12. DELETE /api/servers/:id
  await test('DELETE /api/servers/:id', async () => {
    const res = await invokeApp(app, { method: 'DELETE', url: `/api/servers/${newCreatedId}` });
    if (res.status !== 200 || !res.data.success) {
      throw new Error(`Failed: ${JSON.stringify(res.data)}`);
    }
  });

  // 13. Mock Endpoints
  await test('GET /api/mock/fast', async () => {
    const res = await invokeApp(app, { method: 'GET', url: '/api/mock/fast' });
    if (res.status !== 200 || res.data.status !== 'healthy') {
      throw new Error(`Failed: ${JSON.stringify(res.data)}`);
    }
  });

  await test('GET /api/mock/error', async () => {
    const res = await invokeApp(app, { method: 'GET', url: '/api/mock/error' });
    if (res.status !== 503) {
      throw new Error(`Expected 503, got ${res.status}`);
    }
  });

  console.log('\n======================================================');
  console.log(`Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  server.close(() => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

runMemorySuite();
