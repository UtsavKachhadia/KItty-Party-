# KItty-Party- Technical Progress & Architecture Report

## 1. System Architecture
KItty-Party- is a complex orchestration platform designed to securely execute multi-step workflows utilizing third-party integrations. It is constructed using a decoupled client-server architecture with state-of-the-art backend routing, DAG processing logic, and Intelligent Failure Recovery.

### 1.1 Backend Stack
- **Runtime Environment:** Node.js, Express.js
- **Primary Data Store:** MongoDB (accessed via Mongoose) for highly structured logs, configuration data, user definitions, and workflow execution states.
- **Cache & Telemetry:** Redis is used for high-performance key-value configurations, specifically mediating asynchronous user-approvals for high-risk operations.
- **Real-Time Layer:** `Socket.IO` drives immediate frontend updates corresponding to granular, sub-second execution state changes.

### 1.2 Frontend Stack
- **Build System:** Vite.js for near-instant hot module replacement and optimized production builds.
- **UI Architecture:** React 18 using decoupled context providers and stateful hooks (`useWorkflow`).
- **Styling Paradigm:** Tailwind CSS mixed with vanilla CSS variables driving high-fidelity dynamic theming, dark-mode styling, and semantic visual language (e.g. glassmorphism).

---

## 2. Advanced Technical Components

### 2.1 Natural Language DAG generation (`services/llm.js` & `routes/workflow.js`)
Workflows aren't just predefined; the primary `POST /api/workflow/run` endpoint captures unstructured user intent via Natural Language. An embedded LLM planner constructs an optimized **Directed Acyclic Graph (DAG)** of automation routines (e.g., Jira to GitHub integrations).

### 2.2 Confidence Scoring & Human Automation Interlock (`services/confidenceScorer.js`)
Once an LLM-derived workflow is drafted, KItty-Party- heuristically analyzes the risk profile of each planned action. If the step's "confidence score" (taking into account historical failure rates and destructive potential—like repo-deletion) falls below the user's defined threshold, it inserts a **Redis-backed User Approval Gate**. The system halts execution of that respective node, awaiting WebSockets or an API trigger indicating human approval.

### 2.3 DAG Topological Execution Engine (`services/dagRunner.js`)
Rather than sequentially pinging APIs, the DAG runner processes arrays of JSON instruction payloads concurrently or consecutively based on dependency mapping constraints (topological sort). Socket events are propagated continuously at key lifecycle states:
- `emitStepStarted`
- `emitStepCompleted`
- `emitApprovalRequired`
- `emitWorkflowFailed` / `emitWorkflowCompleted`

### 2.4 Intelligent Failure Recovery (IFR) (`services/ifrEngine.js`)
Unlike generic Zapier alternatives that crash completely when an API 429 returns, KItty-Party- utilizes a 3-tier heuristic recovery system:
- **Tier 1 (Transient Resilience):** Automatically detects `econnreset` / 429 errors and applies Exponential Back-Off.
- **Tier 2 (Heuristic Diagnosis):** If raw execution fails, the connector parameters, trace, and stack error are funneled into `diagnoseError()`. An LLM interprets the structural problem and suggests contextual mitigation schemas.
- **Tier 3 (Hard Escalation):** Completely non-recoverable anomalies halt execution, dispatching state signals to the core DAG runner and preserving the audit record.

### 2.5 Connector Paradigm (`services/connectors/`)
API service wrappers strictly abstract API logic.
- **Slack Connector** (Web API library)
- **GitHub Connector** (`@octokit/rest`)
- **Jira Connector** (Custom Axios abstractions utilizing Basic Auth arrays)
Credentials are not stored dynamically globally globally—credentials reside dynamically scoped to authenticated sub-processes mapped from global JWT verification.

## 3. Persistent Backlog 
1. **Frontend Refinement:** Reconciling dynamic socket payloads into a visual timeline on the `WorkflowPage`.
2. **Dashboard UX:** Migrating visual state logic to display confidence scoring thresholds gracefully.
3. **Connector Expansion:** Designing automated tooling to scale OAuth-based external APIs efficiently without bloating node logic.
