import re
from typing import Dict, Any, List
from ..models.schemas import ParsedLog

CLASSIFICATION_RULES = [
    {
        "category": "DatabaseConnectionError",
        "keywords": [r"connection\s+refused", r"pool\s+exhausted", r"max_connections", r"database\s+down", r"psycopg2", r"sqlalchemy.*timeout", r"fatal:\s+sorry,\s+too\s+many\s+clients"],
        "severity": "CRITICAL",
        "suggested_type": "DatabaseConnectionError"
    },
    {
        "category": "DatabaseDeadlock",
        "keywords": [r"deadlock\s+detected", r"lock\s+wait\s+timeout", r"concurrent\s+update"],
        "severity": "ERROR",
        "suggested_type": "DatabaseDeadlock"
    },
    {
        "category": "NetworkTimeoutError",
        "keywords": [r"etimedout", r"connection\s+timed\s+out", r"gateway\s+timeout", r"read\s+timeout", r"upstream\s+connect\s+error", r"504\s+gateway"],
        "severity": "ERROR",
        "suggested_type": "NetworkTimeoutError"
    },
    {
        "category": "AuthenticationError",
        "keywords": [r"jwt\s+expired", r"invalid\s+token", r"unauthorized", r"forbidden", r"authentication\s+failed", r"invalid\s+signature", r"401\s+unauthorized"],
        "severity": "WARNING",
        "suggested_type": "AuthenticationError"
    },
    {
        "category": "RateLimitError",
        "keywords": [r"too\s+many\s+requests", r"rate\s+limit\s+exceeded", r"quota\s+exceeded", r"429"],
        "severity": "WARNING",
        "suggested_type": "RateLimitError"
    },
    {
        "category": "ResourceExhaustionError",
        "keywords": [r"out\s+of\s+memory", r"heap\s+out\s+of\s+memory", r"disk\s+full", r"no\s+space\s+left", r"cannot\s+allocate\s+memory"],
        "severity": "CRITICAL",
        "suggested_type": "ResourceExhaustionError"
    },
    {
        "category": "NullReferenceError",
        "keywords": [r"nullpointerexception", r"cannot\s+read\s+properties\s+of\s+undefined", r"none\s*type\s*object\s*has\s*no\s*attribute", r"nullreferenceexception"],
        "severity": "ERROR",
        "suggested_type": "NullReferenceError"
    },
    {
        "category": "SerializationError",
        "keywords": [r"json\s+decode\s+error", r"unexpected\s+token", r"cannot\s+serialize", r"syntaxerror:\s+unexpected"],
        "severity": "ERROR",
        "suggested_type": "SerializationError"
    }
]

def classify_log_error(log: ParsedLog) -> Dict[str, Any]:
    text_to_check = f"{log.message} {log.error_type or ''} {log.stack_trace or ''}".lower()
    
    # HTTP status code hints
    if log.status_code:
        if log.status_code == 401 or log.status_code == 403:
            return {
                "category": "AuthenticationError",
                "severity": "WARNING",
                "confidence": 0.95
            }
        elif log.status_code == 429:
            return {
                "category": "RateLimitError",
                "severity": "WARNING",
                "confidence": 0.95
            }
        elif log.status_code == 504:
            return {
                "category": "NetworkTimeoutError",
                "severity": "ERROR",
                "confidence": 0.95
            }
        elif log.status_code >= 500 and log.level in ("INFO", "DEBUG"):
            log.level = "ERROR"

    for rule in CLASSIFICATION_RULES:
        for kw in rule["keywords"]:
            if re.search(kw, text_to_check, re.IGNORECASE):
                return {
                    "category": rule["suggested_type"],
                    "severity": rule["severity"],
                    "confidence": 0.9
                }

    # Fallback classification based on log level or existing type
    if log.level == "CRITICAL":
        return {"category": log.error_type or "CriticalSystemFault", "severity": "CRITICAL", "confidence": 0.7}
    elif log.level == "ERROR":
        return {"category": log.error_type or "ApplicationRuntimeError", "severity": "ERROR", "confidence": 0.65}
    elif log.level == "WARNING":
        return {"category": log.error_type or "SystemWarning", "severity": "WARNING", "confidence": 0.6}
    
    return {"category": "Informational", "severity": log.level, "confidence": 0.5}

def enrich_and_classify_logs(logs: List[ParsedLog]) -> List[ParsedLog]:
    for l in logs:
        if l.level in ("ERROR", "CRITICAL") or (l.status_code and l.status_code >= 400):
            classification = classify_log_error(l)
            if not l.error_type:
                l.error_type = classification["category"]
            if l.level not in ("CRITICAL", "ERROR") and classification["severity"] in ("CRITICAL", "ERROR"):
                l.level = classification["severity"]
    return logs
