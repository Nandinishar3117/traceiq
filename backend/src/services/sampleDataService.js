const ingestionService = require('./ingestionService');
const logger = require('../utils/logger');

class SampleDataService {
  generateRealisticDataset() {
    const now = Date.now();
    const minute = 60 * 1000;
    const logs = [];

    // Realistic Traces
    // Trace 1: Successful checkout flow (auth -> order -> payment -> inventory)
    const t1 = 'trace_flow_982101';
    logs.push({
      timestamp: new Date(now - 25 * minute).toISOString(),
      level: 'INFO',
      service: 'auth-service',
      message: 'User session verified for user_id=u9842',
      trace_id: t1,
      request_id: 'req_auth_01',
      http_method: 'POST',
      endpoint: '/api/v1/auth/verify',
      status_code: 200,
      duration_ms: 45.2,
      metadata: { user_id: 'u9842', is_sample: true }
    });
    logs.push({
      timestamp: new Date(now - 24 * minute).toISOString(),
      level: 'INFO',
      service: 'order-service',
      message: 'Initiated checkout for cart_id=c1092 items=3',
      trace_id: t1,
      request_id: 'req_ord_01',
      http_method: 'POST',
      endpoint: '/api/v1/orders/checkout',
      status_code: 201,
      duration_ms: 185.0,
      metadata: { cart_id: 'c1092', is_sample: true }
    });
    logs.push({
      timestamp: new Date(now - 24 * minute + 500).toISOString(),
      level: 'INFO',
      service: 'payment-gateway',
      message: 'Charge completed for invoice_id=inv_882 amount=149.99 currency=USD',
      trace_id: t1,
      request_id: 'req_pay_01',
      http_method: 'POST',
      endpoint: '/api/v1/payments/charge',
      status_code: 200,
      duration_ms: 320.4,
      metadata: { provider: 'stripe', is_sample: true }
    });
    logs.push({
      timestamp: new Date(now - 23 * minute).toISOString(),
      level: 'INFO',
      service: 'inventory-api',
      message: 'Stock decremented for sku=SKU-772 quantity=3',
      trace_id: t1,
      request_id: 'req_inv_01',
      http_method: 'PATCH',
      endpoint: '/api/v1/inventory/reserve',
      status_code: 200,
      duration_ms: 62.1,
      metadata: { sku: 'SKU-772', is_sample: true }
    });

    // Trace 2: Payment Gateway 504 Timeout Failure (Cascading)
    const t2 = 'trace_flow_fail_7719';
    logs.push({
      timestamp: new Date(now - 15 * minute).toISOString(),
      level: 'INFO',
      service: 'order-service',
      message: 'Customer initiated express checkout order_id=ord_9901',
      trace_id: t2,
      request_id: 'req_ord_02',
      http_method: 'POST',
      endpoint: '/api/v1/orders/checkout',
      status_code: 200,
      duration_ms: 95.0,
      metadata: { order_id: 'ord_9901', is_sample: true }
    });
    logs.push({
      timestamp: new Date(now - 14 * minute).toISOString(),
      level: 'ERROR',
      service: 'payment-gateway',
      message: 'PaymentGatewayTimeout: Stripe API unreachable after 3000ms socket timeout',
      error_type: 'NetworkTimeoutError',
      stack_trace: 'Error: Gateway Timeout\n  at StripeClient.charge (/app/gateways/stripe.js:142)\n  at processTicksAndRejections (node:internal/process/task_queues:95:5)',
      trace_id: t2,
      request_id: 'req_pay_02',
      http_method: 'POST',
      endpoint: '/api/v1/payments/charge',
      status_code: 504,
      duration_ms: 3012.8,
      metadata: { gateway: 'stripe', retry_attempt: 2, is_sample: true }
    });
    logs.push({
      timestamp: new Date(now - 14 * minute + 200).toISOString(),
      level: 'ERROR',
      service: 'order-service',
      message: 'Order checkout failed: Upstream payment service returned HTTP 504 Gateway Timeout',
      error_type: 'NetworkTimeoutError',
      trace_id: t2,
      request_id: 'req_ord_02',
      http_method: 'POST',
      endpoint: '/api/v1/orders/checkout',
      status_code: 502,
      duration_ms: 3120.0,
      metadata: { is_sample: true }
    });

    // Trace 3: Repeated Database Connection Pool Exhaustion (Surge / Critical)
    for (let i = 0; i < 6; i++) {
      const tid = `trace_db_surge_${100 + i}`;
      logs.push({
        timestamp: new Date(now - (8 - i) * minute).toISOString(),
        level: 'CRITICAL',
        service: 'user-db-cluster',
        message: `Database connection pool exhausted: FATAL sorry, too many clients already connected (max_connections=100 reached)`,
        error_type: 'DatabaseConnectionError',
        stack_trace: 'PostgreSQLError: FATAL: remaining connection slots are reserved for non-replication superuser connections\n  at Connection.parseE (/app/node_modules/pg/lib/connection.js:614)',
        trace_id: tid,
        request_id: `req_user_db_${i}`,
        http_method: 'GET',
        endpoint: '/api/v1/users/profile',
        status_code: 500,
        duration_ms: 1250.0 + (i * 150),
        metadata: { client_count: 100, max_allowed: 100, is_sample: true }
      });
    }

    // Trace 4: Repeated Deadlock Errors in Order Service
    for (let i = 0; i < 4; i++) {
      logs.push({
        timestamp: new Date(now - (12 - i * 2) * minute).toISOString(),
        level: 'ERROR',
        service: 'order-service',
        message: `DatabaseDeadlock: deadlock detected while updating inventory reservation for SKU-4091. Process ${8910 + i} waits for ExclusiveLock`,
        error_type: 'DatabaseDeadlock',
        stack_trace: 'DBDeadlockException: Transaction rolled back\n  at OrderRepository.reserveStock (/app/repos/orders.js:88)',
        trace_id: `trace_deadlock_${i}`,
        request_id: `req_lock_${i}`,
        http_method: 'POST',
        endpoint: '/api/v1/inventory/lock',
        status_code: 500,
        duration_ms: 450.0,
        metadata: { sku: 'SKU-4091', is_sample: true }
      });
    }

    // Trace 5: Authentication Token Expired (Warning / 401s)
    for (let i = 0; i < 8; i++) {
      logs.push({
        timestamp: new Date(now - (20 - i) * minute).toISOString(),
        level: 'WARNING',
        service: 'auth-service',
        message: `AuthenticationError: JWT token signature expired for bearer token auth header (exp: ${now - 300000})`,
        error_type: 'AuthenticationError',
        trace_id: `trace_jwt_${i}`,
        request_id: `req_jwt_${i}`,
        http_method: 'GET',
        endpoint: '/api/v1/dashboard/metrics',
        status_code: 401,
        duration_ms: 18.5,
        metadata: { reason: 'token_expired', is_sample: true }
      });
    }

    // Trace 6: Slow API Request (Performance Monitoring)
    for (let i = 0; i < 5; i++) {
      logs.push({
        timestamp: new Date(now - (18 - i * 3) * minute).toISOString(),
        level: 'INFO',
        service: 'inventory-api',
        message: `Inventory batch catalog scan completed. Returned 45,000 items without pagination index`,
        trace_id: `trace_perf_${i}`,
        request_id: `req_perf_${i}`,
        http_method: 'GET',
        endpoint: '/api/v1/inventory/catalog/export',
        status_code: 200,
        duration_ms: 1850.0 + (i * 220), // > 800ms threshold
        metadata: { items_scanned: 45000, is_sample: true }
      });
    }

    // Background DEBUG & INFO logs
    const endpoints = [
      { ep: '/api/v1/health', svc: 'auth-service', m: 'GET', d: 12.0 },
      { ep: '/api/v1/health', svc: 'order-service', m: 'GET', d: 15.0 },
      { ep: '/api/v1/products', svc: 'inventory-api', m: 'GET', d: 75.0 },
      { ep: '/api/v1/users/me', svc: 'auth-service', m: 'GET', d: 42.0 }
    ];

    for (let i = 0; i < 20; i++) {
      const epInfo = endpoints[i % endpoints.length];
      logs.push({
        timestamp: new Date(now - (30 - i) * minute).toISOString(),
        level: i % 3 === 0 ? 'DEBUG' : 'INFO',
        service: epInfo.svc,
        message: `${epInfo.m} ${epInfo.ep} processed successfully`,
        trace_id: `trace_bg_${i}`,
        request_id: `req_bg_${i}`,
        http_method: epInfo.m,
        endpoint: epInfo.ep,
        status_code: 200,
        duration_ms: epInfo.d + Math.random() * 20,
        metadata: { is_sample: true }
      });
    }

    return logs;
  }

  async seedRealisticSampleData() {
    const sampleLogs = this.generateRealisticDataset();
    logger.info(`Seeding ${sampleLogs.length} realistic sample logs through ingestion engine...`);
    const result = await ingestionService.ingestBatch(sampleLogs);
    return {
      message: 'Realistic sample dataset ingested successfully through pipeline',
      seeded_count: result.accepted,
      total_logs: result.total_received
    };
  }
}

module.exports = new SampleDataService();
