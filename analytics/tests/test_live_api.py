import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.main import (
    health_check, parse_logs_endpoint, recurring_groups_endpoint,
    performance_endpoint, debug_recommendations_endpoint, incident_rules_endpoint
)
from src.models.schemas import (
    ParseRequest, RecurringGroupRequest, PerformanceRequest,
    DebugRequest, IncidentRuleEvaluationRequest, ParsedLog
)

def test_fastapi_direct():
    print("--- Testing FastAPI Analytics Endpoints Directly ---")
    
    # 1. Health
    h = health_check()
    assert h["status"] == "healthy"
    print("✓ /health endpoint passed")

    # 2. Parse
    parse_req = ParseRequest(logs=[
        "2026-11-19T21:00:00Z [ERROR] [auth-service] trace_id=t-100 Database connection pool exhausted",
        {"message": "JSON valid log", "service": "order-service", "level": "INFO"}
    ])
    p_res = parse_logs_endpoint(parse_req)
    assert p_res.successful == 2
    assert len(p_res.parsed_logs) == 2
    print("✓ /parse endpoint passed")

    # 3. Recurring Groups
    rg_res = recurring_groups_endpoint(RecurringGroupRequest(logs=p_res.parsed_logs))
    assert rg_res.total_groups >= 1
    print("✓ /recurring-groups endpoint passed")

    # 4. Performance
    perf_res = performance_endpoint(PerformanceRequest(logs=[
        ParsedLog(
            id="p1", timestamp="2026-11-19T21:00:00Z", level="INFO", service="order-service",
            message="checkout ok", endpoint="/api/v1/orders", http_method="POST", duration_ms=120.5
        )
    ]))
    assert perf_res.total_requests == 1
    print("✓ /performance endpoint passed")

    # 5. Debug Recommendations
    debug_res = debug_recommendations_endpoint(DebugRequest(
        message="PostgreSQL connection pool exhausted: sorry, too many clients",
        service="auth-service"
    ))
    assert debug_res.error_type == "DatabaseConnectionExhaustion"
    assert len(debug_res.suggested_steps) >= 2
    print("✓ /debug-recommendations endpoint passed")

    # 6. Incident Rules
    inc_res = incident_rules_endpoint(IncidentRuleEvaluationRequest(logs=[
        ParsedLog(id="i1", timestamp="2026-11-19T21:00:00Z", level="CRITICAL", service="user-db", message="database down: pool exhausted"),
        ParsedLog(id="i2", timestamp="2026-11-19T21:01:00Z", level="CRITICAL", service="user-db", message="database down: pool exhausted")
    ]))
    assert len(inc_res.incidents_to_create) >= 1
    print("✓ /incident-rules endpoint passed")

    print("\nALL FASTAPI ENDPOINTS FUNCTIONING WITH 100% SUCCESS! 🚀")

if __name__ == "__main__":
    test_fastapi_direct()
