const assert = require('assert');
const app = require('../src/app');
const storageService = require('../src/services/storageService');
const ingestionService = require('../src/services/ingestionService');
const sampleDataService = require('../src/services/sampleDataService');

async function runBackendTests() {
  console.log('--- Starting TraceIQ Backend Integration Tests ---');
  const runId = Date.now();

  // 1. Ingestion of Single Log
  console.log('1. Testing Single Log Ingestion...');
  const singleLog = {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    service: 'auth-service',
    message: `User authentication failed: invalid bcrypt hash ${runId}`,
    error_type: 'AuthenticationError',
    trace_id: `tr_test_01_${runId}`,
    request_id: `req_test_01_${runId}`,
    status_code: 401,
    duration_ms: 32.5
  };
  const ingestSingleRes = await ingestionService.ingestSingle(singleLog);
  assert.strictEqual(ingestSingleRes.accepted, 1, 'Single log should be accepted');
  assert.strictEqual(ingestSingleRes.failed, 0, 'No failed logs expected');
  console.log('✓ Single Log Ingestion Passed');

  // 2. Ingestion of Bulk Logs
  console.log('2. Testing Bulk Log Ingestion...');
  const testTraceId = `tr_test_02_${runId}`;
  const bulkLogs = [
    {
      timestamp: new Date().toISOString(),
      level: 'CRITICAL',
      service: 'order-service',
      message: 'Database connection pool exhausted: sorry, too many clients',
      trace_id: testTraceId,
      status_code: 500,
      duration_ms: 1200.0
    },
    {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      service: 'payment-gateway',
      message: 'POST /api/v1/charge successful 200',
      trace_id: testTraceId,
      status_code: 200,
      duration_ms: 150.0
    }
  ];
  const bulkRes = await ingestionService.ingestBatch(bulkLogs);
  assert.strictEqual(bulkRes.accepted, 2, '2 logs should be accepted');
  console.log('✓ Bulk Log Ingestion Passed');

  // 3. Handling Malformed / Invalid Logs Gracefully
  console.log('3. Testing Malformed Log Validation Handling...');
  const mixedLogs = [
    { level: 'INFO', message: 'Valid message', service: 'test-svc' },
    "", // Empty string
    { invalid_key: 123 } // Missing message/log field
  ];
  const mixedRes = await ingestionService.ingestBatch(mixedLogs);
  assert.strictEqual(mixedRes.accepted, 1, 'Only valid record should be accepted');
  assert.strictEqual(mixedRes.failed, 2, '2 invalid records should be tracked');
  assert.strictEqual(mixedRes.validation_errors.length, 2, 'Validation errors should be returned');
  console.log('✓ Malformed Log Validation Passed');

  // 4. Searching and Filtering Logs
  console.log('4. Testing Log Search and Filtering...');
  const searchRes = await storageService.getLogs({
    query: 'authentication',
    limit: 10,
    offset: 0
  });
  assert.ok(searchRes.logs.length >= 1, 'Should find authentication log');
  assert.ok(searchRes.logs.some(l => l.service === 'auth-service'), 'Should include auth-service');
  console.log('✓ Log Search and Filtering Passed');

  // 5. Distributed Traces Retrieval
  console.log('5. Testing Distributed Traces Retrieval...');
  const trace = await storageService.getTraceById(testTraceId);
  assert.ok(trace !== null, `Trace ${testTraceId} should exist`);
  assert.strictEqual(trace.logs.length, 2, 'Trace should contain exactly 2 associated logs');
  assert.ok(trace.services.includes('order-service'), 'Trace should include order-service');
  assert.ok(trace.services.includes('payment-gateway'), 'Trace should include payment-gateway');
  console.log('✓ Distributed Traces Passed');

  // 6. Incident Creation & Status Updating
  console.log('6. Testing Incident Workflow...');
  const newIncident = await storageService.createIncident({
    title: 'Test PostgreSQL Saturation Incident',
    description: 'Connection pool exhausted on orders and auth',
    severity: 'CRITICAL',
    affected_services: ['order-service', 'auth-service']
  });
  assert.ok(newIncident.id, 'Incident should have an ID');
  assert.strictEqual(newIncident.status, 'OPEN');

  const updatedIncident = await storageService.updateIncidentStatus(
    newIncident.id,
    'RESOLVED',
    'Increased max_connections to 200'
  );
  assert.strictEqual(updatedIncident.status, 'RESOLVED');
  assert.ok(updatedIncident.resolved_at !== null, 'Resolved timestamp should be populated');
  console.log('✓ Incident Workflow Passed');

  // 7. Realistic Sample Dataset Seeding
  console.log('7. Testing Sample Dataset Seeding...');
  const seedRes = await sampleDataService.seedRealisticSampleData();
  assert.ok(seedRes.seeded_count > 20, 'Should seed realistic dataset with > 20 logs');
  console.log(`✓ Sample Dataset Seeding Passed (${seedRes.seeded_count} logs seeded)`);

  console.log('\n--- ALL BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY! 🚀 ---');
}

runBackendTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
