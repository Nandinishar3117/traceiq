import re
from typing import List, Optional, Dict, Any
from ..models.schemas import DebugRecommendation, ParsedLog

DEBUG_KNOWLEDGE_BASE = [
    {
        "pattern": r"(?:connection\s+refused|pool\s+exhausted|sorry,\s+too\s+many\s+clients|remaining\s+connection\s+slots\s+are\s+reserved)",
        "error_type": "DatabaseConnectionExhaustion",
        "severity": "CRITICAL",
        "explanation": "The service failed to establish a database connection because the connection pool limit was reached or the database server rejected new sockets.",
        "causes": [
            {"cause": "Connection leak due to unclosed database sessions in async handlers", "likelihood": "65%"},
            {"cause": "Backend worker scale-out exceeded max_connections limit in postgresql.conf", "likelihood": "25%"},
            {"cause": "Slow, unindexed queries holding connections open for extended durations", "likelihood": "10%"}
        ],
        "steps": [
            "Inspect active connections using SELECT * FROM pg_stat_activity WHERE state = 'active';",
            "Verify all repository/ORM queries utilize connection release / auto-commit blocks.",
            "Tune connection pool size (set max_connections to handle peak worker concurrency).",
            "Introduce PgBouncer or a connection pooler if running multiple replicas."
        ],
        "prevention": [
            "Use bounded pool sizes (e.g. max: 20 per pod).",
            "Configure idleTimeoutMillis and connectionTimeoutMillis to fail fast.",
            "Add alert triggers when pool utilization exceeds 80%."
        ],
        "commands": [
            "psql -U postgres -c 'SELECT count(*), state FROM pg_stat_activity GROUP BY state;'",
            "psql -U postgres -c 'SHOW max_connections;'",
            "netstat -an | grep 5432 | wc -l"
        ]
    },
    {
        "pattern": r"(?:deadlock\s+detected|lock\s+wait\s+timeout|concurrent\s+update)",
        "error_type": "DatabaseDeadlock",
        "severity": "ERROR",
        "explanation": "Two or more concurrent database transactions attempted to lock rows in mutually conflicting orders, causing the database engine to abort one transaction.",
        "causes": [
            {"cause": "Transactions updating multiple tables in inconsistent order", "likelihood": "60%"},
            {"cause": "Long-running batch operations locking inventory or user rows during user checkout", "likelihood": "30%"},
            {"cause": "Missing index forcing full table scan locks during updates", "likelihood": "10%"}
        ],
        "steps": [
            "Check PostgreSQL deadlock logs for process IDs and conflicting query statements.",
            "Enforce strict alphabetical or canonical ordering when acquiring locks across tables.",
            "Wrap affected operations in exponential backoff retry loops.",
            "Break large batch transactions into smaller atomic micro-transactions."
        ],
        "prevention": [
            "Always access resources in the same order across all application endpoints.",
            "Use SELECT ... FOR UPDATE SKIP LOCKED for queue-style concurrency.",
            "Keep transactions as short as possible; never perform HTTP calls inside transactions."
        ],
        "commands": [
            "psql -U postgres -c 'SELECT pid, query, state, age(clock_timestamp(), query_start) FROM pg_stat_activity WHERE state != \"idle\";'",
            "grep -i 'deadlock detected' /var/log/postgresql/*.log"
        ]
    },
    {
        "pattern": r"(?:etimedout|504\s+gateway\s+timeout|gateway\s+timeout|upstream\s+connect\s+error|read\s+timeout)",
        "error_type": "UpstreamServiceTimeout",
        "severity": "ERROR",
        "explanation": "A microservice waited for a downstream response or third-party API past the designated socket timeout window.",
        "causes": [
            {"cause": "Downstream service experiencing thread pool or CPU exhaustion", "likelihood": "50%"},
            {"cause": "External payment or notification gateway experiencing degradation", "likelihood": "30%"},
            {"cause": "Network packet loss or misconfigured ingress proxy timeout limit", "likelihood": "20%"}
        ],
        "steps": [
            "Correlate trace ID across services to pinpoint which downstream hop hung.",
            "Inspect latency histograms for upstream dependencies.",
            "Check if third-party provider status page reports outages or elevated latency.",
            "Adjust circuit breaker trip threshold to prevent cascading upstream starvation."
        ],
        "prevention": [
            "Implement Circuit Breaker pattern (fail fast after 3 consecutive timeouts).",
            "Apply fallback degrades (e.g. cache lookups or async queues) for non-blocking paths.",
            "Set explicit timeouts on all HTTP client calls (never allow indefinite socket wait)."
        ],
        "commands": [
            "curl -Iv --connect-timeout 5 https://downstream-service/health",
            "kubectl top pods -n default",
            "traceroute upstream-endpoint"
        ]
    },
    {
        "pattern": r"(?:jwt\s+expired|token\s+expired|invalid\s+signature|jwt\s+malformed|401\s+unauthorized)",
        "error_type": "AuthenticationTokenFailure",
        "severity": "WARNING",
        "explanation": "Incoming request carried an invalid, expired, or tampered authorization token.",
        "causes": [
            {"cause": "Client clock drift or frontend failure to invoke refresh token endpoint before token expiration", "likelihood": "70%"},
            {"cause": "Token signing secret mismatch across service instances after deployment", "likelihood": "20%"},
            {"cause": "Malicious or unauthenticated credential probing", "likelihood": "10%"}
        ],
        "steps": [
            "Verify client token expiration (exp claim) relative to UTC server clock.",
            "Ensure authentication middleware shares identical JWT_SECRET environment variable.",
            "Check frontend HTTP interceptor handles 401 by attempting /api/auth/refresh.",
            "Inspect client IP address in access logs to distinguish normal user expiry from bot attacks."
        ],
        "prevention": [
            "Use standard silent token refresh via short-lived access tokens + secure httpOnly refresh tokens.",
            "Sync NTP time across all container nodes.",
            "Implement automated secret rotation with dual-key validation windows."
        ],
        "commands": [
            "date -u  # verify system UTC clock",
            "echo $JWT_SECRET | sha256sum"
        ]
    },
    {
        "pattern": r"(?:cannot\s+read\s+properties\s+of\s+undefined|nullpointerexception|none\s*type\s*object\s*has\s*no\s*attribute)",
        "error_type": "NullReferenceException",
        "severity": "ERROR",
        "explanation": "Code attempted to access a property or invoke a method on an object that evaluated to null or undefined at runtime.",
        "causes": [
            {"cause": "Unvalidated JSON payload missing required nested fields", "likelihood": "60%"},
            {"cause": "Database query returned no rows but application assumed non-null result", "likelihood": "30%"},
            {"cause": "Race condition in asynchronous data resolution", "likelihood": "10%"}
        ],
        "steps": [
            "Inspect the stack trace line number to identify the exact variable that evaluated to null.",
            "Add optional chaining (?.) or explicit guard clauses.",
            "Introduce request schema validation (e.g. Zod, Joi, or Pydantic) at the API controller boundary.",
            "Verify database queries handle empty results with sensible defaults."
        ],
        "prevention": [
            "Enforce strict schema validation on all ingress endpoints.",
            "Enable TypeScript or static type checking across the codebase.",
            "Unit test edge cases with null, empty arrays, and unexpected JSON keys."
        ],
        "commands": [
            "git blame -L <line>,<line> <file_path>"
        ]
    },
    {
        "pattern": r"(?:out\s+of\s+memory|heap\s+out\s+of\s+memory|cannot\s+allocate\s+memory|killed\s+process)",
        "error_type": "MemoryExhaustionOOM",
        "severity": "CRITICAL",
        "explanation": "Process exceeded OS memory limits or Node.js/JVM heap allocation ceiling, leading to process crash or Linux OOM killer invocation.",
        "causes": [
            {"cause": "Unbounded array accumulator or memory leak in long-running event listener", "likelihood": "55%"},
            {"cause": "Loading massive database result set (e.g. millions of rows) directly into RAM without streaming", "likelihood": "35%"},
            {"cause": "Insufficient memory limit configured in container cgroups", "likelihood": "10%"}
        ],
        "steps": [
            "Check container termination reason (OOMKilled exit code 137).",
            "Generate and analyze memory heap dump using Chrome DevTools or pprof.",
            "Convert large dataset exports to stream pipelines (e.g. Node streams or database cursors).",
            "Increase container memory limit if baseline service workload has grown."
        ],
        "prevention": [
            "Never perform SELECT * without pagination LIMIT / OFFSET.",
            "Stream large payloads to disk or network response.",
            "Monitor container working set memory with Prometheus/cAdvisor."
        ],
        "commands": [
            "node --max-old-space-size=2048 server.js",
            "dmesg -T | grep -i oom",
            "ps -eo pid,ppid,cmd,%mem,%cpu --sort=-%mem | head -10"
        ]
    }
]

def analyze_error_for_debugging(
    message: str,
    error_type: Optional[str] = None,
    stack_trace: Optional[str] = None,
    service: Optional[str] = None,
    context_logs: Optional[List[ParsedLog]] = None
) -> DebugRecommendation:
    """
    Modular Rule-Based AI Debugging Engine.
    Evaluates patterns against domain knowledge base and returns actionable recommendations.
    """
    search_corpus = f"{message} {error_type or ''} {stack_trace or ''}".lower()
    
    for entry in DEBUG_KNOWLEDGE_BASE:
        if re.search(entry["pattern"], search_corpus, re.IGNORECASE):
            return DebugRecommendation(
                error_type=entry["error_type"],
                severity=entry["severity"],
                explanation=entry["explanation"],
                probable_root_causes=entry["causes"],
                suggested_steps=entry["steps"],
                prevention_tips=entry["prevention"],
                diagnostic_commands=entry["commands"],
                confidence_score=0.92
            )

    # Generic Fallback Recommendation for unclassified errors
    detected_type = error_type or "UnhandledApplicationException"
    return DebugRecommendation(
        error_type=detected_type,
        severity="ERROR",
        explanation=f"An unhandled failure occurred in {service or 'the application'}: {message[:160]}.",
        probable_root_causes=[
            {"cause": "Unexpected input parameters or unhandled edge condition in business logic", "likelihood": "50%"},
            {"cause": "Downstream dependency failure or transient network socket abort", "likelihood": "30%"},
            {"cause": "Environment variable or configuration mismatch in target environment", "likelihood": "20%"}
        ],
        suggested_steps=[
            "Examine log context and trace ID for preceding debug events.",
            "Verify request payload matches required API schema contract.",
            "Reproduce locally using the request payload and headers.",
            "Check service health endpoint and recent deploy commit history."
        ],
        prevention_tips=[
            "Wrap external calls in try/catch blocks with contextual error logging.",
            "Add schema validation and unit tests covering error edge cases."
        ],
        diagnostic_commands=[
            "git log -n 5 --oneline",
            "curl -Iv http://localhost:5000/api/health"
        ],
        confidence_score=0.65
    )
