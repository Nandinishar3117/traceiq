from typing import List, Dict
from ..models.schemas import ParsedLog, RecurringGroup

def group_recurring_errors(logs: List[ParsedLog]) -> List[RecurringGroup]:
    """
    Groups error logs by their stable fingerprint.
    Calculates total occurrences, first/last seen timestamps, and affected services.
    """
    groups_dict: Dict[str, Dict] = {}

    for log in logs:
        # Only group ERROR, CRITICAL or failed request logs
        if log.level not in ("ERROR", "CRITICAL") and not (log.status_code and log.status_code >= 400):
            continue

        fp = log.fingerprint or f"fp_{log.service}_{log.level}"
        
        if fp not in groups_dict:
            groups_dict[fp] = {
                "id": f"grp_{fp}",
                "fingerprint": fp,
                "error_type": log.error_type or "ApplicationError",
                "message_template": log.message[:200],
                "first_seen": log.timestamp,
                "last_seen": log.timestamp,
                "total_occurrences": 1,
                "severity": log.level,
                "affected_services": {log.service},
                "sample_log": log
            }
        else:
            g = groups_dict[fp]
            g["total_occurrences"] += 1
            g["affected_services"].add(log.service)
            if log.timestamp < g["first_seen"]:
                g["first_seen"] = log.timestamp
            if log.timestamp > g["last_seen"]:
                g["last_seen"] = log.timestamp
                g["sample_log"] = log
            if log.level == "CRITICAL":
                g["severity"] = "CRITICAL"

    # Convert to RecurringGroup models sorted by total_occurrences descending
    result = []
    for g in groups_dict.values():
        result.append(
            RecurringGroup(
                id=g["id"],
                fingerprint=g["fingerprint"],
                error_type=g["error_type"],
                message_template=g["message_template"],
                first_seen=g["first_seen"],
                last_seen=g["last_seen"],
                total_occurrences=g["total_occurrences"],
                severity=g["severity"],
                affected_services=sorted(list(g["affected_services"])),
                sample_log=g["sample_log"]
            )
        )

    result.sort(key=lambda x: x.total_occurrences, reverse=True)
    return result
