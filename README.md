# TraceIQ – AI-Powered Log Intelligence & Debugging Platform

TraceIQ is a full-stack, production-grade log monitoring, anomaly detection, and automated root-cause debugging platform designed for modern microservice architectures.

Built with **React.js**, **Node.js/Express**, **Python/FastAPI**, **PostgreSQL**, **Elasticsearch**, and **Docker Compose**, TraceIQ processes high-throughput log streams, groups recurring error signatures, computes endpoint-level API latency percentiles, pinpoints statistical error frequency anomalies via Z-scores, and provides transparent, rule-based AI diagnostic runbooks.

---

## 1. Problem Statement

In distributed cloud and microservice systems, diagnosing runtime failures across hundreds of services and millions of log lines is labor-intensive:
- **Alert Fatigue & Noise:** Thousands of raw log lines obscure the underlying root cause.
- **Unstructured Telemetry:** Text-based logs contain inconsistent formats (Apache, Syslog, raw stack traces, NDJSON) without unified correlation IDs.
- **Cascading Outages:** Downstream timeouts trigger multiple unhandled errors across upstream services, obscuring where the failure originated.
- **Slow Resolution Times (MTTR):** On-call engineers spend precious minutes manually deciphering stack traces, running diagnostic queries, and locating recurrence patterns.

**TraceIQ solves this by:**
1. Ingesting both structured JSON and free-text logs through a unified validation pipeline.
2. Generating normalized hash fingerprints to collapse thousands of recurring error occurrences into actionable groups.
3. Correlating distributed traces through request IDs and trace IDs across service boundaries.
4. Detecting statistical error frequency surges using dynamic Z-score thresholds.
5. Providing deterministic, explainable AI debugging recommendations with step-by-step remediation runbooks and executable CLI diagnostic commands.

---

## 2. System Architecture

TraceIQ implements a modular, service-oriented architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    React.js Frontend                        │
│   (Dashboard, Explorer, Errors, Incidents, Traces, AI Debug) │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST / JSON (Port 3000 -> 5000)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Node.js / Express Backend                   │
│   (API Gateway, Ingestion Pipeline, Resilience & Routing)   │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
       REST    │                       REST    │
(Internal JSON)│                (Internal JSON)│
               ▼                               ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│  Python / FastAPI Analytics  │ │         PostgreSQL           │
│  - Log Normalization         │ │  - Error Groups & Fingerprints│
│  - Z-Score Anomaly Engine    │ │  - Incidents & Timelines     │
│  - Latency Percentiles (p90) │ │  - Microservice Metadata     │
│  - AI Diagnostic Heuristics  │ │  - Structured Log Records    │
└──────────────────────────────┘ └──────────────────────────────┘
               │
               ▼
┌──────────────────────────────┐
│        Elasticsearch         │
│  - Inverted Index Mapping    │
│  - Full-Text Message Search  │
│  - Multi-Field Filter Query  │
└──────────────────────────────┘
```

### Component Responsibilities:

| Service | Technology | Role & Primary Responsibility |
|---|---|---|
| **Frontend** | React 18, HTML, CSS | Dark developer SaaS dashboard, interactive visualizations, real-time KPI metrics, span waterfall inspection, and AI debugging console. |
| **Backend Gateway** | Node.js 20, Express | High-throughput REST API gateway, request schema validation, file upload handling, multi-database resilience, and incident status lifecycle. |
| **Analytics Engine** | Python 3.11, FastAPI | High-performance log parsing, fingerprint hashing, Z-score anomaly detection, API latency percentiles (p50, p90, p99), and rule-based AI diagnostic reasoning. |
| **Relational Database** | PostgreSQL 15 | Relational integrity, error groups, incident audit logs, application registrations, and fallback persistence. |
| **Search Engine** | Elasticsearch 8.11 | High-speed inverted index full-text search, regex search, and severity/service query filtering. |
| **Orchestration** | Docker & Compose | Single-command containerized deployment with healthcheck dependencies and internal bridge networks. |

---

## 3. Technology Stack

- **Frontend:** React.js 18, JavaScript, HTML5, CSS3, Lucide React (no Next.js, no external CSS libraries).
- **Backend:** Node.js 20, Express.js, `pg` (PostgreSQL client), `@elastic/elasticsearch` (Elasticsearch client), `multer` (multipart upload), `axios`.
- **Analytics:** Python 3.11/3.13, FastAPI, Uvicorn, Pydantic, NumPy, Python-Dateutil.
- **Database & Search:** PostgreSQL 15, Elasticsearch 8.11.
- **Deployment & Containers:** Docker, Docker Compose, Nginx.

---

## 4. Key Features & Capabilities

### 1. Overview Dashboard
- Ingestion metrics: Total logs ingested, error count, critical errors, active incidents, aggregate error rate, and average API latency.
- Interactive volume and error frequency chart grouped by time buckets.
- Microservice health status cards (Healthy, Degraded, Critical).
- Real-time display of latest statistical anomalies and recent error logs.

### 2. Log Explorer & Ingestion
- Live log stream search with multi-field filtering (Severity, Service, Date range, Error type).
- Log detail modal showing raw message, stack trace, trace ID, request ID, duration, and metadata.
- Single log entry manual ingestion modal.
- Multipart log file upload (`.log`, `.json`, `.txt`) supporting batch parsing without silent data loss.

### 3. Error Intelligence & Grouping
- Automated clustering of recurring errors by normalized hash fingerprint (strips UUIDs, timestamps, IDs, and hex addresses).
- Occurrence tracking, first seen / last seen timestamps, and list of affected microservices.
- Visual occurrence distribution bars.
- One-click navigation to AI Debugger with pre-populated error context.

### 4. Incident Management
- Incident declaration and tracking (Status: `OPEN`, `INVESTIGATING`, `RESOLVED`).
- Automated incident detection rule engine (identifies critical surges, database connection pool exhaustion, and cascading microservice failures).
- Complete incident event audit timeline and linked error logs.
- Interactive status updating with documented root cause notes.

### 5. Distributed Request Tracing
- Visualizes cross-service request lifecycles using correlated `trace_id` and `request_id`.
- Service path traversal indicators (e.g., `auth-service → order-service → payment-gateway`).
- Waterfall span latency view showing individual microservice execution time and HTTP status codes.

### 6. Performance Monitoring
- API latency percentiles: Average, Minimum, Maximum, p50 (Median), p90, and p99.
- Latency distribution histogram (0-100ms, 100-300ms, 300-800ms, 800-2000ms, 2000ms+).
- Endpoint-level performance matrix with error rate and bottleneck flags.
- Slow requests list filterable by configurable latency threshold.

### 7. AI Debugger & Diagnostic Engine
- Transparent, deterministic root cause inference using rule-based diagnostic algorithms.
- Plain-English explanation of why the failure occurred in distributed cloud systems.
- Probable root causes with percentage likelihood ratings.
- Step-by-step remediation runbooks (immediate mitigation vs. long-term prevention).
- Actionable, copyable CLI diagnostic commands (`psql -c 'SELECT ... FROM pg_stat_activity'`, `curl`, `netstat`).

### 8. Settings & Infrastructure Health
- Real-time connection health checks for Node.js Backend, PostgreSQL, Elasticsearch, and FastAPI Analytics.
- Graceful degradation status indicators (active PostgreSQL vs. local persistence fallback; active Elasticsearch vs. database search fallback).
- Active cluster configuration reference.

---

## 5. Folder Structure

```
TraceIQ/
├── frontend/                     # React.js SPA
│   ├── public/                   # Static assets & index.html
│   ├── src/
│   │   ├── components/common/    # Header, Sidebar, MetricCard, StatusBadge, Modal
│   │   ├── pages/                # 8 Platform Pages
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── LogExplorerPage.jsx
│   │   │   ├── ErrorIntelligencePage.jsx
│   │   │   ├── IncidentsPage.jsx
│   │   │   ├── DistributedTracesPage.jsx
│   │   │   ├── PerformancePage.jsx
│   │   │   ├── AIDebuggerPage.jsx
│   │   │   └── SettingsPage.jsx
│   │   ├── services/api.js       # Centralized REST API client
│   │   ├── App.jsx               # Navigation shell and state
│   │   ├── index.css             # Professional dark developer design system
│   │   └── main.jsx
│   ├── nginx.conf                # Nginx proxy configuration for Docker
│   ├── Dockerfile
│   └── package.json
├── backend/                      # Node.js + Express Gateway
│   ├── src/
│   │   ├── config/env.js         # Centralized environment configuration
│   │   ├── controllers/          # 8 REST controllers
│   │   ├── routes/               # Express modular route definitions
│   │   ├── services/             # Postgres, Elasticsearch, Storage & Ingestion
│   │   ├── middlewares/          # Validation & error handling
│   │   ├── utils/logger.js
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/backend.test.js     # Backend integration test suite
│   ├── Dockerfile
│   └── package.json
├── analytics/                    # Python + FastAPI Analytics Engine
│   ├── src/
│   │   ├── engine/               # Parser, classifier, anomaly, perf, debugger
│   │   ├── models/schemas.py     # Pydantic data schemas
│   │   ├── config.py
│   │   └── main.py               # FastAPI application
│   ├── tests/                    # Analytics unit tests & live endpoint tests
│   ├── requirements.txt
│   └── Dockerfile
├── database/
│   ├── postgres/                 # PostgreSQL schema and init scripts
│   │   ├── schema.sql
│   │   └── init.sql
│   └── elasticsearch/
│       └── mappings.json         # Index mappings & analyzer definitions
├── sample_data/                  # Realistic sample telemetry datasets
│   ├── microservices_logs.json
│   └── standard_app.log
├── docker-compose.yml            # Multi-service container orchestration
├── .env.example
└── README.md
```

---

## 6. Database Design (PostgreSQL)

TraceIQ utilizes a normalized relational schema with targeted B-tree indexes:

```sql
-- Core Logs Table
CREATE TABLE logs (
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
    error_group_id VARCHAR(64) REFERENCES error_groups(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Deduplicated Error Clusters
CREATE TABLE error_groups (
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Incidents
CREATE TABLE incidents (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(32) DEFAULT 'OPEN',
    error_group_id VARCHAR(64) REFERENCES error_groups(id),
    affected_services JSONB NOT NULL DEFAULT '[]'::jsonb,
    triggered_by VARCHAR(128) DEFAULT 'rule_engine',
    root_cause TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);
```

Indexes are created on `logs(timestamp DESC)`, `logs(level)`, `logs(service)`, `logs(trace_id)`, and `error_groups(fingerprint)` to guarantee sub-millisecond retrieval under heavy read volumes.

---

## 7. Elasticsearch Usage

Elasticsearch is used for full-text inverted indexing and high-speed multi-attribute filtering:
- **Analyzers:** A custom analyzer (`log_message_analyzer`) uses standard tokenization with lowercase and stop-word filtering.
- **Keyword Fields:** `level`, `service`, `trace_id`, and `request_id` are indexed as exact keywords for deterministic filtering.
- **Multi-Match Search:** User search queries simultaneously evaluate `message` (boosted 3x), `error_type` (boosted 2x), `service`, `trace_id`, and `stack_trace`.
- **Fault-Tolerant Fallback:** If Elasticsearch is temporarily unreachable, the Node.js backend seamlessly executes queries against PostgreSQL or local persistence, reporting the connection status cleanly without throwing uncaught exceptions.

---

## 8. Analytics Engine Algorithms

1. **Error Fingerprint Normalization:**
   To group recurring errors reliably, messages are parsed through regular expressions that replace dynamic substrings (UUIDs, memory hex addresses, numeric IDs, IP addresses) with static tokens (`<UUID>`, `<HEX>`, `<ID>`, `<IP>`). The SHA-256 hash of `service:error_type:normalized_string` forms the deduplication key.
2. **Z-Score Anomaly Detection:**
   Error logs are partitioned into time buckets (default 5 minutes). The baseline mean ($\mu$) and sample standard deviation ($\sigma$) are computed:
   $$Z = \frac{x - \mu}{\sigma}$$
   Time windows where $Z \ge 2.0$ (or where count surges by $\ge 2.0\times$ the mean with $\ge 5$ occurrences) are flagged as statistical anomalies.
3. **Latency Percentiles:**
   API request spans containing `duration_ms` are aggregated per endpoint. Using NumPy, the exact 50th, 90th, and 99th percentiles are computed alongside minimum, maximum, and average response times.
4. **Rule-Based AI Debugging:**
   A domain knowledge base matches regex signatures for high-impact failure modes (database connection pool exhaustion, transaction deadlocks, upstream 504 timeouts, expired JWT signatures, memory leaks, and null references). It provides confidence scores, root cause likelihood percentages, and actionable CLI commands.

---

## 9. API Documentation

### System & Health Endpoints
- `GET /api/health` – Returns backend gateway operational health.
- `GET /api/settings/status` – Live connectivity health check for Backend, PostgreSQL, Elasticsearch, and FastAPI Analytics.
- `GET /api/settings/config` – Retrieves cluster configuration settings and supported log formats.

### Ingestion & Logs Endpoints
- `POST /api/logs/ingest` – Ingests a single log record.
- `POST /api/logs/bulk` – Ingests an array of log records in bulk.
- `POST /api/logs/upload` – Multipart file upload for `.log`, `.txt`, and `.json` files.
- `GET /api/logs` – Retrieves paginated logs with full-text search and severity/service filters.
- `GET /api/logs/:id` – Fetches a single log record by ID.

### Analytics & Intelligence Endpoints
- `GET /api/analytics/dashboard-summary` – Aggregated cluster KPIs, charts, and health cards.
- `GET /api/analytics/anomalies` – Detects error frequency surges via Z-score evaluation.
- `POST /api/analytics/seed-sample-data` – Seeds realistic multi-service microservice logs through the ingestion pipeline.
- `GET /api/errors/groups` – Returns deduplicated recurring error groups.
- `GET /api/errors/groups/:id` – Fetches an error group and its linked log occurrences.
- `GET /api/errors/stats` – Computes error breakdown by severity, service, and timeline.

### Incidents Endpoints
- `GET /api/incidents` – Lists active and resolved incidents.
- `POST /api/incidents` – Manually opens a new system incident.
- `GET /api/incidents/:id` – Fetches incident details, audit timeline, and related error logs.
- `PATCH /api/incidents/:id/status` – Updates incident lifecycle status (`OPEN`, `INVESTIGATING`, `RESOLVED`) and root cause notes.
- `POST /api/incidents/auto-detect` – Evaluates automated incident trigger rules against recent telemetry.

### Traces & Performance Endpoints
- `GET /api/traces` – Lists correlated distributed traces with traversed services and total latency.
- `GET /api/traces/:traceId` – Retrieves span waterfall visualization for a specific distributed trace.
- `GET /api/performance/metrics` – Endpoint-level latency averages, p50, p90, p99 percentiles, and distribution histogram.
- `GET /api/performance/slow-requests` – Returns requests exceeding the slow response threshold.
- `POST /api/debugger/analyze` – Evaluates error telemetry and returns AI root-cause diagnostics and remediation runbooks.

---

## 10. Installation & Running Instructions

### Option A: Run with Docker Compose (Recommended Production Setup)

Prerequisites: Ensure **Docker** and **Docker Compose** are installed and running.

1. Clone the repository and navigate to the project directory:
   ```bash
   cd TraceIQ
   ```

2. Copy the example environment configuration:
   ```bash
   cp .env.example .env
   ```

3. Build and launch all 5 containers:
   ```bash
   docker compose up --build
   ```

4. Access the platform:
   - **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
   - **Node.js API Gateway:** [http://localhost:5000/api/health](http://localhost:5000/api/health)
   - **FastAPI Analytics Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Elasticsearch Health:** [http://localhost:9200](http://localhost:9200)

---

### Option B: Run Locally for Development

Prerequisites:
- **Node.js** v18+ and **npm**
- **Python** 3.10+ and **pip**

#### 1. Start Python FastAPI Analytics Service
```bash
cd TraceIQ/analytics
pip install -r requirements.txt
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Start Node.js Express Backend Gateway
```bash
cd TraceIQ/backend
npm install
npm start
```

*Note: In local mode without Docker, the backend gracefully utilizes its local persistence layer and full-text search fallback, allowing complete feature demonstration without requiring local PostgreSQL or Elasticsearch instances.*

#### 3. Start React Frontend Dashboard
```bash
cd TraceIQ/frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 11. Testing

### Run Backend Integration Tests
Tests single ingestion, bulk ingestion, validation failure handling, search filtering, trace retrieval, incident workflow, and sample data seeding:
```bash
cd TraceIQ/backend
npm test
```

### Run Python Analytics Unit Tests
Tests log parsing, error classification, recurring grouping, Z-score anomaly detection, latency percentiles, AI debugger heuristics, and incident rules:
```bash
cd TraceIQ/analytics
python tests/test_analytics.py
```

### Run FastAPI Endpoint Validation Tests
Validates all REST endpoints exposed by FastAPI:
```bash
cd TraceIQ/analytics
python tests/test_live_api.py
```

### Build Frontend Production Assets
Verifies that all React components, JSX templates, and styling compile cleanly:
```bash
cd TraceIQ/frontend
npm run build
```

---

## 12. Known Limitations & Future Enhancements

- **Kafka Ingestion Buffer:** For extremely large-scale ingestion (> 100,000 logs/sec), an event buffer such as Apache Kafka could be placed ahead of the ingestion gateway. Per project requirements, external message brokers were strictly excluded.
- **LLM Diagnostic Integration:** The AI Debugger currently implements deterministic, rule-based diagnostic algorithms. Its modular design allows seamless connection to external LLMs (e.g., Google Gemini API) by updating `debugger_engine.py` without altering frontend or backend contracts.
- **OpenTelemetry Ingestion:** Native OTLP gRPC endpoint receivers can be introduced in a future release to receive telemetry directly from OpenTelemetry collectors.

---

## 13. Placement & Interview Architecture Walkthrough

When presenting TraceIQ during a technical placement interview:
1. **Explain the Ingestion Pipeline:** Walk through how raw logs enter the Node.js API Gateway, get validated and parsed into structured JSON schemas by the FastAPI analytics engine, get deduplicated via SHA-256 fingerprint hashing, and get indexed into PostgreSQL and Elasticsearch.
2. **Highlight Resilience & Graceful Degradation:** Emphasize that the backend handles database or search cluster outages gracefully through fallback persistence and error handling middleware without dropping user requests.
3. **Discuss Distributed Tracing:** Explain how cross-service propagation is reconstructed using `trace_id` headers to measure end-to-end latency and identify cascading microservice failures.
4. **Demonstrate AI Root Cause Debugging:** Show how common production failures (e.g., PostgreSQL connection saturation, deadlocks, JWT expirations) are parsed into plain-English explanations, prioritized root causes, remediation runbooks, and executable diagnostic CLI commands.
