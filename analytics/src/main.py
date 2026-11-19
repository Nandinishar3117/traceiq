import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any

from .config import settings
from .models.schemas import (
    ParseRequest, ParseResponse, ParsedLog,
    ClassifyRequest,
    RecurringGroupRequest, RecurringGroupResponse,
    AnomalyRequest, AnomalyResponse,
    PerformanceRequest, PerformanceResponse,
    DebugRequest, DebugRecommendation,
    IncidentRuleEvaluationRequest, IncidentRuleEvaluationResponse
)
from .engine.log_parser import parse_single_record
from .engine.error_classifier import enrich_and_classify_logs, classify_log_error
from .engine.recurring_grouper import group_recurring_errors
from .engine.anomaly_detector import detect_error_anomalies
from .engine.performance_analyzer import calculate_performance_metrics
from .engine.debugger_engine import analyze_error_for_debugging
from .engine.incident_rules import evaluate_incident_rules

app = FastAPI(
    title="TraceIQ Analytics Engine",
    description="Intelligent log parsing, error classification, anomaly detection, and debugging service",
    version="1.0.0"
)

# Enable CORS for communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "traceiq-analytics",
        "version": "1.0.0",
        "timestamp": "2026-11-19T22:00:00Z"
    }

@app.post("/parse", response_model=ParseResponse)
def parse_logs_endpoint(payload: ParseRequest):
    """
    Parses a batch of log records (strings or dicts) into standard structured format.
    Gracefully handles malformed records and returns actionable validation information.
    """
    parsed_logs: List[ParsedLog] = []
    validation_errors: List[Dict[str, Any]] = []

    for index, item in enumerate(payload.logs):
        log_obj, error_reason = parse_single_record(item)
        if log_obj:
            parsed_logs.append(log_obj)
        else:
            validation_errors.append({
                "record_index": index,
                "raw_input": str(item)[:200],
                "error": error_reason or "Invalid log format"
            })

    # Automatically classify errors in the parsed batch
    enriched = enrich_and_classify_logs(parsed_logs)

    return ParseResponse(
        total_received=len(payload.logs),
        successful=len(enriched),
        failed=len(validation_errors),
        parsed_logs=enriched,
        validation_errors=validation_errors
    )

@app.post("/classify")
def classify_endpoint(payload: ClassifyRequest):
    """Classifies log errors and infers severity and categories."""
    enriched = enrich_and_classify_logs(payload.logs)
    return {"classified_logs": enriched}

@app.post("/recurring-groups", response_model=RecurringGroupResponse)
def recurring_groups_endpoint(payload: RecurringGroupRequest):
    """Groups recurring error logs by normalized fingerprint."""
    groups = group_recurring_errors(payload.logs)
    total_grouped = sum(g.total_occurrences for g in groups)
    return RecurringGroupResponse(
        groups=groups,
        total_groups=len(groups),
        total_errors_grouped=total_grouped
    )

@app.post("/anomalies", response_model=AnomalyResponse)
def anomalies_endpoint(payload: AnomalyRequest):
    """Detects statistical surges and anomalies in log error frequencies."""
    return detect_error_anomalies(
        logs=payload.logs,
        bucket_minutes=payload.bucket_minutes,
        z_threshold=payload.z_threshold
    )

@app.post("/performance", response_model=PerformanceResponse)
def performance_endpoint(payload: PerformanceRequest):
    """Computes endpoint-level API performance metrics and latency percentiles."""
    return calculate_performance_metrics(
        logs=payload.logs,
        slow_threshold_ms=payload.slow_threshold_ms
    )

@app.post("/debug-recommendations", response_model=DebugRecommendation)
def debug_recommendations_endpoint(payload: DebugRequest):
    """
    Rule-based AI Debugger: Analyzes errors and provides transparent explanations,
    probable root causes, remediation steps, and diagnostic CLI commands.
    """
    return analyze_error_for_debugging(
        message=payload.message,
        error_type=payload.error_type,
        stack_trace=payload.stack_trace,
        service=payload.service,
        context_logs=payload.context_logs
    )

@app.post("/incident-rules", response_model=IncidentRuleEvaluationResponse)
def incident_rules_endpoint(payload: IncidentRuleEvaluationRequest):
    """Evaluates rule-based triggers to automatically open incidents."""
    incidents = evaluate_incident_rules(
        logs=payload.logs,
        existing_incidents=payload.existing_incidents
    )
    return IncidentRuleEvaluationResponse(incidents_to_create=incidents)

if __name__ == "__main__":
    uvicorn.run("analytics.src.main:app", host="0.0.0.0", port=8000, reload=False)
