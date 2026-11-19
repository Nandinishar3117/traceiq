import math
from datetime import datetime, timezone
from typing import List, Dict
from dateutil import parser as date_parser
from ..models.schemas import ParsedLog, AnomalyPoint, AnomalyResponse

def detect_error_anomalies(logs: List[ParsedLog], bucket_minutes: int = 5, z_threshold: float = 2.0) -> AnomalyResponse:
    """
    Detects unusual surges in error frequency across time intervals using Z-score.
    Buckets error logs by timestamp, computes baseline statistics, and flags anomalies.
    """
    error_logs = [l for l in logs if l.level in ("ERROR", "CRITICAL") or (l.status_code and l.status_code >= 500)]
    
    if not error_logs:
        return AnomalyResponse(
            anomalies=[],
            total_anomalies=0,
            baseline_mean=0.0,
            baseline_std=0.0
        )

    # 1. Bucket error logs into time intervals
    bucket_counts: Dict[str, int] = {}
    service_bucket_counts: Dict[str, Dict[str, int]] = {}

    for log in error_logs:
        try:
            dt = date_parser.parse(log.timestamp)
            # Round down to bucket_minutes
            minute = (dt.minute // bucket_minutes) * bucket_minutes
            bucket_key = dt.replace(minute=minute, second=0, microsecond=0).isoformat()
        except Exception:
            bucket_key = "current_interval"

        bucket_counts[bucket_key] = bucket_counts.get(bucket_key, 0) + 1
        
        if bucket_key not in service_bucket_counts:
            service_bucket_counts[bucket_key] = {}
        svc = log.service
        service_bucket_counts[bucket_key][svc] = service_bucket_counts[bucket_key].get(svc, 0) + 1

    counts = list(bucket_counts.values())
    if not counts:
        return AnomalyResponse(anomalies=[], total_anomalies=0, baseline_mean=0.0, baseline_std=0.0)

    # 2. Compute Baseline Mean & Standard Deviation (using Bessel correction if N > 1)
    n = len(counts)
    mean = sum(counts) / n
    variance = sum((c - mean) ** 2 for c in counts) / (n - 1 if n > 1 else 1)
    std_dev = math.sqrt(variance) if variance > 0 else 1.0

    anomalies: List[AnomalyPoint] = []

    # 3. Check each bucket against z_threshold or sudden multiplier spike
    for bucket_key, count in sorted(bucket_counts.items()):
        z = (count - mean) / std_dev if std_dev > 0 else 0.0
        # Flag anomaly if Z-score exceeds threshold OR count is 2.5x mean with minimum count
        ratio = count / max(mean, 1.0)
        is_anomaly = bool((z >= z_threshold or (ratio >= 2.0 and count >= 5)) and count >= 3)
        
        # Determine dominant service causing this bucket
        dominant_service = None
        if bucket_key in service_bucket_counts:
            dominant_service = max(service_bucket_counts[bucket_key].items(), key=lambda x: x[1])[0]

        if is_anomaly:
            anomalies.append(
                AnomalyPoint(
                    bucket_timestamp=bucket_key,
                    error_count=count,
                    expected_count=round(mean, 2),
                    z_score=round(z, 2),
                    is_anomaly=True,
                    service=dominant_service,
                    description=f"Spike of {count} errors in {bucket_minutes}-min window (Z-score: {round(z, 2)}, baseline: {round(mean, 1)}). Primary source: {dominant_service}."
                )
            )

    return AnomalyResponse(
        anomalies=anomalies,
        total_anomalies=len(anomalies),
        baseline_mean=round(mean, 2),
        baseline_std=round(std_dev, 2)
    )
