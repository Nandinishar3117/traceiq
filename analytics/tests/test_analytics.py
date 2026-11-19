import sys
import os

# Add analytics directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.engine.log_parser import parse_single_record, parse_text_log_line
from src.engine.error_classifier import classify_log_error, enrich_and_classify_logs
from src.engine.recurring_grouper import group_recurring_errors
from src.engine.anomaly_detector import detect_error_anomalies
from src.engine.performance_analyzer import calculate_performance_metrics
from src.engine.debugger_engine import analyze_error_for_debugging
from src.engine.incident_rules import evaluate_incident_rules
from src.models.schemas import ParsedLog

def test_log_parsing():
    print("Testing Log Parsing...")
    # Test JSON dict
    json_log = {
        "timestamp": "2026-11-19T20:00:00Z",
        "level": "ERROR",
        "service": "payment-gateway",
        "message": "Stripe API timeout after 3000ms",
        "endpoint": "/api/v1/charge",
        "http_method": "POST",
        "status_code": 504,
        "duration_ms": 3050.2,
        "trace_id": "tr-1001",
        "request_id": "req-999"
    }
    parsed, err = parse_single_record(json_log)
    assert err is None, f"Expected no error, got {err}"
    assert parsed.service == "payment-gateway"
    assert parsed.level == "ERROR"
    assert parsed.duration_ms == 3050.2
    assert parsed.fingerprint is not None

    # Test raw text string
    raw_text = "2026-11-19T21:05:00Z [CRITICAL] [auth-service] trace_id=t-abc req=r-123 Database connection pool exhausted: sorry, too many clients"
    parsed_text, err_text = parse_single_record(raw_text)
    assert err_text is None
    assert parsed_text.service == "auth-service"
    assert parsed_text.level == "CRITICAL"
    assert parsed_text.trace_id == "t-abc"
    assert "Database connection pool exhausted" in parsed_text.message
    print("✓ Log Parsing Passed")

def test_error_classification():
    print("Testing Error Classification...")
    log = ParsedLog(
        id="1",
        timestamp="2026-11-19T20:00:00Z",
        level="ERROR",
        service="user-db",
        message="FATAL: sorry, too many clients already connected to database",
        status_code=500
    )
    res = classify_log_error(log)
    assert res["category"] == "DatabaseConnectionError"
    assert res["severity"] == "CRITICAL"
    print("✓ Error Classification Passed")

def test_recurring_grouping():
    print("Testing Recurring Grouping...")
    logs = [
        ParsedLog(
            id=f"log_{i}",
            timestamp=f"2026-11-19T20:0{i}:00Z",
            level="ERROR",
            service="order-service",
            message=f"Order checkout failed for user {i}: Deadlock detected while waiting for lock",
            fingerprint="deadlock_fingerprint"
        )
        for i in range(5)
    ]
    groups = group_recurring_errors(logs)
    assert len(groups) == 1
    assert groups[0].total_occurrences == 5
    assert "order-service" in groups[0].affected_services
    print("✓ Recurring Grouping Passed")

def test_anomaly_detection():
    print("Testing Anomaly Detection...")
    # Generate steady state then a spike
    logs = []
    # Normal background: 2 errors at 20:00
    for _ in range(2):
        logs.append(ParsedLog(id="a", timestamp="2026-11-19T20:00:00Z", level="ERROR", service="api", message="error"))
    # Normal background: 2 errors at 20:05
    for _ in range(2):
        logs.append(ParsedLog(id="b", timestamp="2026-11-19T20:05:00Z", level="ERROR", service="api", message="error"))
    # Huge spike: 30 errors at 20:10
    for _ in range(30):
        logs.append(ParsedLog(id="c", timestamp="2026-11-19T20:10:00Z", level="ERROR", service="payment-service", message="payment failed"))

    res = detect_error_anomalies(logs, bucket_minutes=5, z_threshold=1.5)
    assert res.total_anomalies >= 1
    assert any("payment-service" in a.description for a in res.anomalies)
    print("✓ Anomaly Detection Passed")

def test_performance_analysis():
    print("Testing Performance Analysis...")
    logs = [
        ParsedLog(
            id="1", timestamp="2026-11-19T20:00:00Z", level="INFO", service="order-service",
            message="request handled", endpoint="/api/v1/orders", http_method="GET", duration_ms=120.0
        ),
        ParsedLog(
            id="2", timestamp="2026-11-19T20:01:00Z", level="INFO", service="order-service",
            message="request handled", endpoint="/api/v1/orders", http_method="GET", duration_ms=180.0
        ),
        ParsedLog(
            id="3", timestamp="2026-11-19T20:02:00Z", level="ERROR", service="order-service",
            message="slow request timeout", endpoint="/api/v1/checkout", http_method="POST", duration_ms=1500.0, status_code=504
        )
    ]
    res = calculate_performance_metrics(logs, slow_threshold_ms=800.0)
    assert res.total_requests == 3
    assert res.slow_request_count == 1
    assert len(res.endpoints) == 2
    checkout_ep = next(e for e in res.endpoints if e.endpoint == "/api/v1/checkout")
    assert checkout_ep.is_slow is True
    assert checkout_ep.error_rate == 100.0
    print("✓ Performance Analysis Passed")

def test_debugger_engine():
    print("Testing AI Debugger Engine...")
    rec = analyze_error_for_debugging(
        message="sorry, too many clients already connected to PostgreSQL server",
        service="auth-service"
    )
    assert rec.error_type == "DatabaseConnectionExhaustion"
    assert rec.severity == "CRITICAL"
    assert len(rec.probable_root_causes) >= 2
    assert len(rec.suggested_steps) >= 2
    assert len(rec.diagnostic_commands) >= 1
    print("✓ AI Debugger Engine Passed")

def test_incident_rules():
    print("Testing Incident Rules...")
    critical_logs = [
        ParsedLog(
            id=f"crit_{i}", timestamp=f"2026-11-19T20:0{i}:00Z", level="CRITICAL",
            service="auth-service", message="Database connection pool exhausted: sorry, too many clients"
        )
        for i in range(3)
    ]
    incidents = evaluate_incident_rules(critical_logs)
    assert len(incidents) >= 1
    assert incidents[0].severity == "CRITICAL"
    print("✓ Incident Rules Passed")

if __name__ == "__main__":
    test_log_parsing()
    test_error_classification()
    test_recurring_grouping()
    test_anomaly_detection()
    test_performance_analysis()
    test_debugger_engine()
    test_incident_rules()
    print("\nALL ANALYTICS TESTS PASSED SUCCESSFULLY! 🚀")
