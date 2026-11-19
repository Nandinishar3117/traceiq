from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field

class RawLogInput(BaseModel):
    raw_text: str

class ParsedLog(BaseModel):
    id: Optional[str] = None
    timestamp: str
    level: str
    service: str
    message: str
    error_type: Optional[str] = None
    stack_trace: Optional[str] = None
    trace_id: Optional[str] = None
    request_id: Optional[str] = None
    http_method: Optional[str] = None
    endpoint: Optional[str] = None
    status_code: Optional[int] = None
    duration_ms: Optional[float] = None
    fingerprint: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class ParseRequest(BaseModel):
    logs: List[Union[Dict[str, Any], str]]

class ParseResponse(BaseModel):
    total_received: int
    successful: int
    failed: int
    parsed_logs: List[ParsedLog]
    validation_errors: List[Dict[str, Any]] = Field(default_factory=list)

class ClassifyRequest(BaseModel):
    logs: List[ParsedLog]

class RecurringGroup(BaseModel):
    id: str
    fingerprint: str
    error_type: str
    message_template: str
    first_seen: str
    last_seen: str
    total_occurrences: int
    severity: str
    affected_services: List[str]
    sample_log: Optional[ParsedLog] = None

class RecurringGroupRequest(BaseModel):
    logs: List[ParsedLog]

class RecurringGroupResponse(BaseModel):
    groups: List[RecurringGroup]
    total_groups: int
    total_errors_grouped: int

class AnomalyPoint(BaseModel):
    bucket_timestamp: str
    error_count: int
    expected_count: float
    z_score: float
    is_anomaly: bool
    service: Optional[str] = None
    description: str

class AnomalyRequest(BaseModel):
    logs: List[ParsedLog]
    bucket_minutes: int = 5
    z_threshold: float = 2.0

class AnomalyResponse(BaseModel):
    anomalies: List[AnomalyPoint]
    total_anomalies: int
    baseline_mean: float
    baseline_std: float

class EndpointPerformance(BaseModel):
    service: str
    endpoint: str
    http_method: str
    avg_duration_ms: float
    min_duration_ms: float
    max_duration_ms: float
    p50_duration_ms: float
    p90_duration_ms: float
    p99_duration_ms: float
    request_count: int
    error_count: int
    error_rate: float
    is_slow: bool

class PerformanceRequest(BaseModel):
    logs: List[ParsedLog]
    slow_threshold_ms: float = 800.0

class PerformanceResponse(BaseModel):
    total_requests: int
    overall_avg_duration_ms: float
    slow_request_count: int
    endpoints: List[EndpointPerformance]

class DebugRequest(BaseModel):
    message: str
    error_type: Optional[str] = None
    stack_trace: Optional[str] = None
    service: Optional[str] = None
    context_logs: List[ParsedLog] = Field(default_factory=list)

class DebugRecommendation(BaseModel):
    error_type: str
    severity: str
    explanation: str
    probable_root_causes: List[Dict[str, Any]]
    suggested_steps: List[str]
    prevention_tips: List[str]
    diagnostic_commands: List[str]
    confidence_score: float

class IncidentRuleEvaluationRequest(BaseModel):
    logs: List[ParsedLog]
    existing_incidents: List[Dict[str, Any]] = Field(default_factory=list)

class GeneratedIncident(BaseModel):
    title: str
    description: str
    severity: str
    affected_services: List[str]
    triggered_by: str
    root_cause_hint: str
    suggested_actions: List[str]
    related_log_ids: List[str]

class IncidentRuleEvaluationResponse(BaseModel):
    incidents_to_create: List[GeneratedIncident]
