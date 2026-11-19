import re
import json
import uuid
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, Optional
from dateutil import parser as date_parser
from ..models.schemas import ParsedLog

# Common Regex Patterns
ISO_TIMESTAMP_PATTERN = re.compile(r'(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)')
LOG_LEVEL_PATTERN = re.compile(r'\b(DEBUG|INFO|WARN|WARNING|ERROR|CRITICAL|FATAL)\b', re.IGNORECASE)
SERVICE_PATTERN = re.compile(r'\[([a-zA-Z0-9_\-\.]+)\]|service=([a-zA-Z0-9_\-\.]+)')
TRACE_ID_PATTERN = re.compile(r'(?:trace[-_]?id[:=]|trace=)([a-zA-Z0-9_\-]+)', re.IGNORECASE)
REQUEST_ID_PATTERN = re.compile(r'(?:request[-_]?id[:=]|req[-_]?id[:=]|req=)([a-zA-Z0-9_\-]+)', re.IGNORECASE)
HTTP_ENDPOINT_PATTERN = re.compile(r'\b(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s+([/\w\-\.\?=&%]+)(?:\s+HTTP/[\d\.]+)?\s+(\d{3})?', re.IGNORECASE)
DURATION_PATTERN = re.compile(r'(?:duration|response_time|took)[:=]?\s*(\d+(?:\.\d+)?)\s*(ms|s)?', re.IGNORECASE)

# Normalization regex for fingerprinting
UUID_REGEX = re.compile(r'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}')
HEX_ADDR_REGEX = re.compile(r'0x[0-9a-fA-F]+')
IP_ADDR_REGEX = re.compile(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b')
NUMERIC_ID_REGEX = re.compile(r'(/|id=|\bid:|\b#)(\d+)')
QUOTED_STR_REGEX = re.compile(r"'[^']*'|\"[^\"]*\"")

def compute_fingerprint(service: str, message: str, error_type: Optional[str] = None) -> str:
    """
    Computes a stable fingerprint hash by normalizing dynamic tokens
    (UUIDs, IDs, IP addresses, timestamps, memory addresses).
    """
    norm = message or ""
    norm = UUID_REGEX.sub("<UUID>", norm)
    norm = HEX_ADDR_REGEX.sub("<HEX>", norm)
    norm = IP_ADDR_REGEX.sub("<IP>", norm)
    norm = NUMERIC_ID_REGEX.sub(r'\1<ID>', norm)
    # Strip leading/trailing whitespaces and lowercase
    norm_cleaned = re.sub(r'\s+', ' ', norm).strip().lower()
    
    prefix = (error_type or "GenericError").lower()
    raw_str = f"{service.lower()}:{prefix}:{norm_cleaned[:250]}"
    return hashlib.sha256(raw_str.encode('utf-8')).hexdigest()[:16]

def normalize_level(raw_level: Optional[str]) -> str:
    if not raw_level:
        return "INFO"
    l = raw_level.strip().upper()
    if l in ("WARN", "WARNING"):
        return "WARNING"
    if l in ("CRIT", "CRITICAL", "FATAL"):
        return "CRITICAL"
    if l in ("ERR", "ERROR"):
        return "ERROR"
    if l in ("DEBUG", "TRACE"):
        return "DEBUG"
    return "INFO"

def parse_iso_or_custom_timestamp(raw_time: Optional[Any]) -> str:
    now_iso = datetime.now(timezone.utc).isoformat()
    if not raw_time:
        return now_iso
    try:
        if isinstance(raw_time, (int, float)):
            # Timestamp in milliseconds or seconds
            if raw_time > 1e11:  # ms
                dt = datetime.fromtimestamp(raw_time / 1000.0, tz=timezone.utc)
            else:
                dt = datetime.fromtimestamp(raw_time, tz=timezone.utc)
            return dt.isoformat()
        
        parsed = date_parser.parse(str(raw_time))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.isoformat()
    except Exception:
        return now_iso

def parse_text_log_line(line: str) -> ParsedLog:
    """Parses an unformatted or standard text log string."""
    clean_line = line.strip()
    log_id = f"log_{uuid.uuid4().hex[:12]}"
    
    # 1. Extract Timestamp
    ts_match = ISO_TIMESTAMP_PATTERN.search(clean_line)
    timestamp = parse_iso_or_custom_timestamp(ts_match.group(1) if ts_match else None)
    
    # 2. Extract Level and Service from brackets or explicit keywords
    level = "INFO"
    service = "app-service"

    brackets = re.findall(r'\[([a-zA-Z0-9_\-\.]+)\]', clean_line)
    for b in brackets:
        b_upper = b.upper()
        if b_upper in ("DEBUG", "INFO", "WARN", "WARNING", "ERROR", "CRITICAL", "FATAL"):
            level = normalize_level(b_upper)
        elif service == "app-service":
            service = b

    # If level wasn't found in brackets, try regex
    if level == "INFO":
        level_match = LOG_LEVEL_PATTERN.search(clean_line)
        if level_match:
            level = normalize_level(level_match.group(1))

    # If service wasn't found in brackets, try service= pattern
    if service == "app-service":
        svc_kw_match = re.search(r'\bservice=([a-zA-Z0-9_\-\.]+)', clean_line)
        if svc_kw_match:
            service = svc_kw_match.group(1)
        
    # 4. Extract Tracing metadata
    trace_match = TRACE_ID_PATTERN.search(clean_line)
    trace_id = trace_match.group(1) if trace_match else None
    
    req_match = REQUEST_ID_PATTERN.search(clean_line)
    request_id = req_match.group(1) if req_match else None
    
    # 5. Extract HTTP info
    http_match = HTTP_ENDPOINT_PATTERN.search(clean_line)
    http_method = None
    endpoint = None
    status_code = None
    if http_match:
        http_method = http_match.group(1).upper()
        endpoint = http_match.group(2)
        if http_match.group(3):
            status_code = int(http_match.group(3))
            
    # 6. Extract Duration
    dur_match = DURATION_PATTERN.search(clean_line)
    duration_ms = None
    if dur_match:
        val = float(dur_match.group(1))
        unit = (dur_match.group(2) or 'ms').lower()
        duration_ms = val * 1000.0 if unit == 's' else val

    # 7. Extract Error Type
    error_type = None
    err_match = re.search(r'([A-Za-z0-9_]+(?:Error|Exception|Fault|Failure))', clean_line)
    if err_match:
        error_type = err_match.group(1)
        if level == "INFO":
            level = "ERROR"

    # 8. Clean message
    # If the log line begins with timestamp/level/service, extract the body
    message = clean_line
    # If error status code >= 500, default level to ERROR
    if status_code and status_code >= 500 and level in ("INFO", "DEBUG"):
        level = "ERROR"

    fingerprint = compute_fingerprint(service, message, error_type)

    return ParsedLog(
        id=log_id,
        timestamp=timestamp,
        level=level,
        service=service,
        message=message,
        error_type=error_type,
        stack_trace=None,
        trace_id=trace_id,
        request_id=request_id,
        http_method=http_method,
        endpoint=endpoint,
        status_code=status_code,
        duration_ms=duration_ms,
        fingerprint=fingerprint,
        metadata={}
    )

def parse_single_record(item: Any) -> Tuple[Optional[ParsedLog], Optional[str]]:
    """Validates and parses a single log record (dict or string)."""
    try:
        if isinstance(item, str):
            item_str = item.strip()
            if not item_str:
                return None, "Empty log string"
            if item_str.startswith("{") and item_str.endswith("}"):
                try:
                    item_dict = json.loads(item_str)
                    return parse_single_record(item_dict)
                except Exception:
                    pass
            return parse_text_log_line(item_str), None

        if isinstance(item, dict):
            # Dict validation
            message = item.get("message") or item.get("msg") or item.get("log") or ""
            if not message and not item.get("error"):
                return None, "Missing required log field 'message' or 'log'"

            msg_text = str(message)
            service = str(item.get("service") or item.get("service_name") or item.get("app") or "app-service")
            level = normalize_level(item.get("level") or item.get("severity") or item.get("log_level"))
            timestamp = parse_iso_or_custom_timestamp(item.get("timestamp") or item.get("time") or item.get("@timestamp"))
            
            error_type = item.get("error_type") or item.get("error") or item.get("exception")
            if not error_type:
                err_match = re.search(r'([A-Za-z0-9_]+(?:Error|Exception|Fault|Failure))', msg_text)
                if err_match:
                    error_type = err_match.group(1)

            stack_trace = item.get("stack_trace") or item.get("stacktrace") or item.get("traceback")
            trace_id = item.get("trace_id") or item.get("traceId")
            request_id = item.get("request_id") or item.get("requestId")
            http_method = item.get("http_method") or item.get("method")
            endpoint = item.get("endpoint") or item.get("path") or item.get("url")
            
            status_code = item.get("status_code") or item.get("statusCode")
            if status_code is not None:
                try:
                    status_code = int(status_code)
                except Exception:
                    status_code = None

            duration_ms = item.get("duration_ms") or item.get("responseTime") or item.get("duration")
            if duration_ms is not None:
                try:
                    duration_ms = float(duration_ms)
                except Exception:
                    duration_ms = None

            log_id = item.get("id") or f"log_{uuid.uuid4().hex[:12]}"
            fingerprint = compute_fingerprint(service, msg_text, error_type)

            parsed = ParsedLog(
                id=log_id,
                timestamp=timestamp,
                level=level,
                service=service,
                message=msg_text,
                error_type=str(error_type) if error_type else None,
                stack_trace=str(stack_trace) if stack_trace else None,
                trace_id=str(trace_id) if trace_id else None,
                request_id=str(request_id) if request_id else None,
                http_method=str(http_method).upper() if http_method else None,
                endpoint=str(endpoint) if endpoint else None,
                status_code=status_code,
                duration_ms=duration_ms,
                fingerprint=fingerprint,
                metadata=item.get("metadata") or {}
            )
            return parsed, None

        return None, f"Unsupported log record type: {type(item).__name__}"
    except Exception as e:
        return None, f"Parsing exception: {str(e)}"
