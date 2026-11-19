from typing import List, Dict, Any
from ..models.schemas import ParsedLog, GeneratedIncident

def evaluate_incident_rules(logs: List[ParsedLog], existing_incidents: List[Dict[str, Any]] = None) -> List[GeneratedIncident]:
    """
    Evaluates rule-based triggers to automatically identify system incidents
    from log streams without manual intervention.
    """
    existing_titles = set()
    if existing_incidents:
        for inc in existing_incidents:
            if inc.get("status") in ("OPEN", "INVESTIGATING"):
                existing_titles.add(inc.get("title", "").strip().lower())

    new_incidents: List[GeneratedIncident] = []

    # Rule 1: Database Connection Pool Exhaustion or DB Down
    db_errors = [l for l in logs if any(k in l.message.lower() for k in ["pool exhausted", "max_connections", "sorry, too many clients", "database down"])]
    if len(db_errors) >= 2:
        title = "Database Connection Pool Exhaustion Incident"
        if title.lower() not in existing_titles:
            services = list({l.service for l in db_errors})
            log_ids = [l.id for l in db_errors if l.id]
            new_incidents.append(
                GeneratedIncident(
                    title=title,
                    description=f"Multiple database connection pool exhaustion errors detected across services: {', '.join(services)}. Requests are being rejected.",
                    severity="CRITICAL",
                    affected_services=services,
                    triggered_by="rule:db_pool_exhaustion_surge",
                    root_cause_hint="Database connections exceeded configured limit or active client leak detected.",
                    suggested_actions=[
                        "Inspect active connections via pg_stat_activity.",
                        "Scale up database max_connections or restart leaking pods.",
                        "Enable connection pooler (e.g., PgBouncer)."
                    ],
                    related_log_ids=log_ids[:10]
                )
            )

    # Rule 2: Payment Gateway or Auth Outage / Timeout
    payment_errors = [l for l in logs if ("payment" in l.service.lower() or "stripe" in l.message.lower()) and (l.level in ("ERROR", "CRITICAL") or (l.status_code and l.status_code >= 500))]
    if len(payment_errors) >= 3:
        title = "Payment Processing Service Degradation"
        if title.lower() not in existing_titles:
            services = list({l.service for l in payment_errors})
            log_ids = [l.id for l in payment_errors if l.id]
            new_incidents.append(
                GeneratedIncident(
                    title=title,
                    description=f"Elevated failure rate detected in payment workflows. {len(payment_errors)} payment-related error events recorded.",
                    severity="HIGH",
                    affected_services=services,
                    triggered_by="rule:payment_failure_threshold",
                    root_cause_hint="Payment gateway API timeouts or upstream processing rejections.",
                    suggested_actions=[
                        "Verify Stripe/Payment gateway webhook receiver availability.",
                        "Check outbound egress proxy status.",
                        "Inspect payment service circuit breaker status."
                    ],
                    related_log_ids=log_ids[:10]
                )
            )

    # Rule 3: Cascading Failure (same trace_id failing across multiple services)
    trace_failures: Dict[str, List[ParsedLog]] = {}
    for l in logs:
        if l.trace_id and (l.level in ("ERROR", "CRITICAL") or (l.status_code and l.status_code >= 500)):
            trace_failures.setdefault(l.trace_id, []).append(l)

    for trace_id, err_list in trace_failures.items():
        distinct_services = {l.service for l in err_list}
        if len(distinct_services) >= 2:
            title = f"Cascading Service Failure (Trace: {trace_id})"
            if title.lower() not in existing_titles:
                new_incidents.append(
                    GeneratedIncident(
                        title=title,
                        description=f"A failure in one service cascaded through downstream dependencies: {', '.join(distinct_services)}.",
                        severity="HIGH",
                        affected_services=sorted(list(distinct_services)),
                        triggered_by="rule:cross_service_trace_cascade",
                        root_cause_hint=f"Uncaught exception propagated along trace {trace_id}.",
                        suggested_actions=[
                            f"Trace distributed request execution for trace_id={trace_id}.",
                            "Check timeout and retry policies between calling services."
                        ],
                        related_log_ids=[l.id for l in err_list if l.id][:10]
                    )
                )
                break  # Don't overwhelm with too many cascade incidents

    # Rule 4: Generic Critical Surge (>= 4 CRITICAL logs)
    critical_logs = [l for l in logs if l.level == "CRITICAL"]
    if len(critical_logs) >= 4 and not new_incidents:
        title = "Critical System Error Rate Spike"
        if title.lower() not in existing_titles:
            services = list({l.service for l in critical_logs})
            new_incidents.append(
                GeneratedIncident(
                    title=title,
                    description=f"{len(critical_logs)} CRITICAL error logs observed across infrastructure. System reliability at risk.",
                    severity="CRITICAL",
                    affected_services=services,
                    triggered_by="rule:critical_log_volume_threshold",
                    root_cause_hint="Sudden surge in critical application errors.",
                    suggested_actions=[
                        "Inspect recent deployment releases.",
                        "Review active error logs in Log Explorer.",
                        "Check resource utilization (CPU, memory, disk)."
                    ],
                    related_log_ids=[l.id for l in critical_logs if l.id][:10]
                )
            )

    return new_incidents
