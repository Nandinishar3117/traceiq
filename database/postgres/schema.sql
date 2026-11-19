-- TraceIQ PostgreSQL Schema
-- Database initialization for production-style log intelligence platform

CREATE TABLE IF NOT EXISTS applications (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL UNIQUE,
    environment VARCHAR(32) DEFAULT 'production',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS error_groups (
    id VARCHAR(64) PRIMARY KEY,
    fingerprint VARCHAR(255) NOT NULL UNIQUE,
    error_type VARCHAR(128) NOT NULL,
    message_template TEXT NOT NULL,
    first_seen TIMESTAMP WITH TIME ZONE NOT NULL,
    last_seen TIMESTAMP WITH TIME ZONE NOT NULL,
    total_occurrences INTEGER DEFAULT 1,
    severity VARCHAR(20) NOT NULL,
    affected_services JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(32) DEFAULT 'unresolved',
    sample_log_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    level VARCHAR(20) NOT NULL,
    service VARCHAR(128) NOT NULL,
    message TEXT NOT NULL,
    error_type VARCHAR(128),
    stack_trace TEXT,
    trace_id VARCHAR(128),
    request_id VARCHAR(128),
    http_method VARCHAR(10),
    endpoint VARCHAR(255),
    status_code INTEGER,
    duration_ms NUMERIC(10,2),
    error_group_id VARCHAR(64) REFERENCES error_groups(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incidents (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(32) DEFAULT 'OPEN',
    error_group_id VARCHAR(64) REFERENCES error_groups(id) ON DELETE SET NULL,
    affected_services JSONB NOT NULL DEFAULT '[]'::jsonb,
    triggered_by VARCHAR(128) DEFAULT 'rule_engine',
    root_cause TEXT,
    recommendations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS incident_logs (
    incident_id VARCHAR(64) REFERENCES incidents(id) ON DELETE CASCADE,
    log_id VARCHAR(64) REFERENCES logs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (incident_id, log_id)
);

CREATE TABLE IF NOT EXISTS performance_metrics (
    id VARCHAR(64) PRIMARY KEY,
    service VARCHAR(128) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    avg_duration_ms NUMERIC(10,2) NOT NULL,
    min_duration_ms NUMERIC(10,2) NOT NULL,
    max_duration_ms NUMERIC(10,2) NOT NULL,
    p50_duration_ms NUMERIC(10,2),
    p90_duration_ms NUMERIC(10,2),
    p99_duration_ms NUMERIC(10,2),
    request_count INTEGER NOT NULL,
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analysis_results (
    id VARCHAR(64) PRIMARY KEY,
    type VARCHAR(64) NOT NULL,
    target_id VARCHAR(128),
    summary TEXT NOT NULL,
    details JSONB NOT NULL,
    severity VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for high performance querying
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_service ON logs(service);
CREATE INDEX IF NOT EXISTS idx_logs_trace_id ON logs(trace_id);
CREATE INDEX IF NOT EXISTS idx_logs_request_id ON logs(request_id);
CREATE INDEX IF NOT EXISTS idx_logs_error_group_id ON logs(error_group_id);
CREATE INDEX IF NOT EXISTS idx_logs_endpoint ON logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_error_groups_fingerprint ON error_groups(fingerprint);
CREATE INDEX IF NOT EXISTS idx_error_groups_severity ON error_groups(severity);
CREATE INDEX IF NOT EXISTS idx_error_groups_status ON error_groups(status);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_perf_service_endpoint ON performance_metrics(service, endpoint);
CREATE INDEX IF NOT EXISTS idx_analysis_type ON analysis_results(type);
