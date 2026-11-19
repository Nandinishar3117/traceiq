from typing import List, Dict
import numpy as np
from ..models.schemas import ParsedLog, EndpointPerformance, PerformanceResponse

def calculate_performance_metrics(logs: List[ParsedLog], slow_threshold_ms: float = 800.0) -> PerformanceResponse:
    """
    Computes endpoint-level API performance metrics and latency distributions.
    Extracts duration_ms, calculates p50, p90, p99 percentiles, and flags bottlenecks.
    """
    # Filter logs that represent HTTP/API requests with duration
    request_logs = [l for l in logs if l.endpoint and l.duration_ms is not None]
    
    if not request_logs:
        return PerformanceResponse(
            total_requests=0,
            overall_avg_duration_ms=0.0,
            slow_request_count=0,
            endpoints=[]
        )

    # Group by (service, endpoint, http_method)
    grouped: Dict[str, Dict] = {}

    all_durations = []
    slow_count = 0

    for l in request_logs:
        dur = float(l.duration_ms)
        all_durations.append(dur)
        if dur >= slow_threshold_ms:
            slow_count += 1

        method = l.http_method or "GET"
        endpoint = l.endpoint
        svc = l.service
        key = f"{svc}:{method}:{endpoint}"

        if key not in grouped:
            grouped[key] = {
                "service": svc,
                "endpoint": endpoint,
                "http_method": method,
                "durations": [],
                "error_count": 0
            }

        grouped[key]["durations"].append(dur)
        if l.level in ("ERROR", "CRITICAL") or (l.status_code and l.status_code >= 400):
            grouped[key]["error_count"] += 1

    overall_avg = float(np.mean(all_durations)) if all_durations else 0.0

    endpoints_list: List[EndpointPerformance] = []

    for item in grouped.values():
        durs = np.array(item["durations"])
        count = len(durs)
        avg_dur = float(np.mean(durs))
        min_dur = float(np.min(durs))
        max_dur = float(np.max(durs))
        p50 = float(np.percentile(durs, 50))
        p90 = float(np.percentile(durs, 90))
        p99 = float(np.percentile(durs, 99))
        err_count = item["error_count"]
        err_rate = round((err_count / count) * 100.0, 2) if count > 0 else 0.0
        is_slow = bool(avg_dur >= slow_threshold_ms or p90 >= slow_threshold_ms)

        endpoints_list.append(
            EndpointPerformance(
                service=item["service"],
                endpoint=item["endpoint"],
                http_method=item["http_method"],
                avg_duration_ms=round(avg_dur, 2),
                min_duration_ms=round(min_dur, 2),
                max_duration_ms=round(max_dur, 2),
                p50_duration_ms=round(p50, 2),
                p90_duration_ms=round(p90, 2),
                p99_duration_ms=round(p99, 2),
                request_count=count,
                error_count=err_count,
                error_rate=err_rate,
                is_slow=is_slow
            )
        )

    # Sort endpoints by avg_duration_ms descending
    endpoints_list.sort(key=lambda x: x.avg_duration_ms, reverse=True)

    return PerformanceResponse(
        total_requests=len(request_logs),
        overall_avg_duration_ms=round(overall_avg, 2),
        slow_request_count=slow_count,
        endpoints=endpoints_list
    )
