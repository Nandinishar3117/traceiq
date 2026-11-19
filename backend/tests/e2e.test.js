const assert = require('assert');
const app = require('../src/app');

async function runE2ETests() {
  console.log('=== TraceIQ End-to-End API Integration Verification ===');
  
  const testPort = 5055;
  const server = app.listen(testPort);
  const baseUrl = `http://localhost:${testPort}/api`;

  try {
    // 1. Health Endpoint
    console.log('Testing GET /api/health...');
    let res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    let body = await res.json();
    assert.strictEqual(body.status, 'healthy');
    console.log('✓ /api/health passed');

    // 2. Settings Status
    console.log('Testing GET /api/settings/status...');
    res = await fetch(`${baseUrl}/settings/status`);
    assert.strictEqual(res.status, 200);
    body = await res.json();
    assert.ok(body.data.connections.backend.healthy);
    console.log('✓ /api/settings/status passed');

    // 3. Single Ingestion
    console.log('Testing POST /api/logs/ingest...');
    res = await fetch(`${baseUrl}/logs/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'CRITICAL',
        service: 'payment-gateway',
        message: 'FATAL: Payment socket connection refused to banking gateway',
        endpoint: '/api/v1/payments/process',
        http_method: 'POST',
        status_code: 500,
        duration_ms: 1250.0,
        trace_id: 'tr_e2e_001'
      })
    });
    assert.strictEqual(res.status, 201);
    body = await res.json();
    assert.strictEqual(body.data.accepted, 1);
    console.log('✓ /api/logs/ingest passed');

    // 4. Bulk Ingestion
    console.log('Testing POST /api/logs/bulk...');
    res = await fetch(`${baseUrl}/logs/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        {
          level: 'INFO',
          service: 'auth-service',
          message: 'User session renewed',
          endpoint: '/api/v1/auth/refresh',
          http_method: 'POST',
          status_code: 200,
          duration_ms: 35.0,
          trace_id: 'tr_e2e_001'
        },
        {
          level: 'WARNING',
          service: 'inventory-api',
          message: 'Inventory low stock warning for SKU-889',
          endpoint: '/api/v1/inventory/items',
          http_method: 'GET',
          status_code: 200,
          duration_ms: 45.0
        }
      ])
    });
    assert.strictEqual(res.status, 201);
    body = await res.json();
    assert.strictEqual(body.data.accepted, 2);
    console.log('✓ /api/logs/bulk passed');

    // 5. Query Logs with Filter
    console.log('Testing GET /api/logs...');
    res = await fetch(`${baseUrl}/logs?level=CRITICAL`);
    assert.strictEqual(res.status, 200);
    body = await res.json();
    assert.ok(body.data.logs.length >= 1);
    console.log('✓ /api/logs filtering passed');

    // 6. Error Groups
    console.log('Testing GET /api/errors/groups...');
    res = await fetch(`${baseUrl}/errors/groups`);
    assert.strictEqual(res.status, 200);
    body = await res.json();
    assert.ok(Array.isArray(body.data.groups));
    console.log('✓ /api/errors/groups passed');

    // 7. Error Statistics
    console.log('Testing GET /api/errors/stats...');
    res = await fetch(`${baseUrl}/errors/stats`);
    assert.strictEqual(res.status, 200);
    body = await res.json();
    assert.ok(body.data.total_logs > 0);
    console.log('✓ /api/errors/stats passed');

    // 8. Incident Creation & Lifecycle
    console.log('Testing POST & PATCH /api/incidents...');
    res = await fetch(`${baseUrl}/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Banking Gateway Socket Disconnect',
        description: 'Payment gateway rejected customer orders',
        severity: 'CRITICAL',
        affected_services: ['payment-gateway']
      })
    });
    assert.strictEqual(res.status, 201);
    body = await res.json();
    const incId = body.data.id;

    // Update status
    res = await fetch(`${baseUrl}/incidents/${incId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'RESOLVED',
        root_cause: 'Network socket restarted'
      })
    });
    assert.strictEqual(res.status, 200);
    body = await res.json();
    assert.strictEqual(body.data.status, 'RESOLVED');
    console.log('✓ /api/incidents lifecycle passed');

    // 9. Distributed Traces
    console.log('Testing GET /api/traces...');
    res = await fetch(`${baseUrl}/traces`);
    assert.strictEqual(res.status, 200);
    body = await res.json();
    const e2eTrace = body.data.traces.find(t => t.trace_id === 'tr_e2e_001');
    assert.ok(e2eTrace, 'Trace tr_e2e_001 should exist across services');
    console.log('✓ /api/traces passed');

    // 10. Performance Metrics
    console.log('Testing GET /api/performance/metrics...');
    res = await fetch(`${baseUrl}/performance/metrics`);
    assert.strictEqual(res.status, 200);
    body = await res.json();
    assert.ok(body.data.latency_distribution.length > 0);
    console.log('✓ /api/performance/metrics passed');

    // 11. AI Debugger Analysis
    console.log('Testing POST /api/debugger/analyze...');
    res = await fetch(`${baseUrl}/debugger/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'FATAL: sorry, too many clients already connected to database. max_connections=100 reached.',
        service: 'user-db-cluster'
      })
    });
    assert.strictEqual(res.status, 200);
    body = await res.json();
    assert.ok(body.data.analysis.explanation);
    assert.ok(body.data.analysis.probable_root_causes.length > 0);
    console.log('✓ /api/debugger/analyze passed');

    // 12. Overview Dashboard Summary
    console.log('Testing GET /api/analytics/dashboard-summary...');
    res = await fetch(`${baseUrl}/analytics/dashboard-summary`);
    assert.strictEqual(res.status, 200);
    body = await res.json();
    assert.ok(body.data.total_logs > 0);
    assert.ok(body.data.services_health.length > 0);
    console.log('✓ /api/analytics/dashboard-summary passed');

    console.log('\n=== ALL E2E API INTEGRATION TESTS PASSED 100% SUCCESSFULLY! 🚀 ===');
  } finally {
    server.close();
  }
}

runE2ETests().catch(err => {
  console.error('E2E Test Execution Error:', err);
  process.exit(1);
});
