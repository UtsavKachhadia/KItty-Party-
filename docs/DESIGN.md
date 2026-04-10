# Agentic MCP Gateway — System Design Document

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│                    Socket.io Client + REST API                  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │ HTTP (Express) │ WebSocket (io)  │
              └────────────────┼────────────────┘
                               │
┌──────────────────────────────┴──────────────────────────────────┐
│                         Backend (Node.js)                        │
│                                                                  │
│  ┌──────────┐  ┌───────────┐  ┌────────────┐  ┌─────────────┐  │
│  │  Routes   │→│  Services  │→│ Connectors  │→│  External    │  │
│  │ workflow  │  │  llm       │  │  github     │  │  APIs        │  │
│  │ execute   │  │  dagRunner │  │  slack      │  │  (GitHub,    │  │
│  │ audit     │  │  ifrEngine │  │  jira       │  │   Slack,     │  │
│  │ connectors│  │  confScore │  │             │  │   Jira)      │  │
│  └──────────┘  └───────────┘  └────────────┘  └─────────────┘  │
│                      │                                           │
│         ┌────────────┼────────────┐                              │
│         │            │            │                              │
│    ┌────┴────┐ ┌─────┴────┐ ┌────┴────┐                        │
│    │ MongoDB  │ │  Redis   │ │  Groq   │                        │
│    │ (Runs,   │ │ (Approval│ │  LLM    │                        │
│    │ Audits)  │ │  signals)│ │ (Plans) │                        │
│    └─────────┘ └──────────┘ └─────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

## Request Flow: POST /api/workflow/run

```
1. User sends { userInput: "..." }
       │
2. llm.planWorkflow(userInput) ──→ Groq API ──→ DAG JSON
       │
3. confidenceScorer.scoreDAG(dag) ──→ scored DAG with approval flags
       │
4. Create Run document in MongoDB
       │
5. Return { runId, dag, status: "running" } immediately
       │
6. dagRunner.runDAG(run, io) runs in background:
       │
       ├── topologicalSort(steps) → ordered execution list
       │
       └── for each step (in order):
           ├── emit step:started
           ├── if requiresApproval → emit step:approval_required
           │   └── poll Redis for approval signal (500ms interval, 5min timeout)
           ├── connector.execute(action, params)
           ├── write AuditLog
           ├── on success → emit step:completed
           └── on failure → ifrEngine.handleFailure()
               ├── Tier 1: retry transient errors
               ├── Tier 2: LLM diagnosis
               └── Tier 3: escalate
```

## Data Flow

### DAG Structure (from LLM)
```json
{
  "workflowName": "Bug Report Flow",
  "steps": [
    { "id": "step_1", "connector": "github", "action": "createIssue", "dependsOn": [] },
    { "id": "step_2", "connector": "slack", "action": "postMessage", "dependsOn": ["step_1"] },
    { "id": "step_3", "connector": "jira", "action": "createTicket", "dependsOn": ["step_1"] }
  ]
}
```

Steps 2 and 3 depend on step 1, so step 1 executes first, then 2 and 3 can run (currently sequential via topological sort).

## Intelligent Failure Recovery (IFR)

| Tier | Trigger | Action |
|------|---------|--------|
| 1 | Transient error (timeout, 429, 503) | Retry once after 2s |
| 2 | Non-transient error | Send to Groq for root cause analysis |
| 3 | Diagnosis fails | Escalate with raw error, mark step failed |

## Confidence Scoring Algorithm

```
Base confidence = 0.85
  - 0.20  if connector not available
  - 0.15  if action not in known actions list
  - 0.10  if required params missing/empty
  + 0.10  if no dependencies (simpler step)
  Average with LLM-provided confidence
  Clamp [0, 1]

  requiresApproval = confidence < 0.6
  autoExecute      = confidence >= 0.8
```

## Approval Flow

1. DAG runner encounters step with `requiresApproval: true`
2. Emits `step:approval_required` via Socket.io
3. Polls Redis key `run:{runId}:approval:{stepId}` every 500ms
4. Frontend calls `POST /api/execute/approve` or `/reject` → sets Redis key
5. DAG runner reads the key and proceeds or skips

## Security

- All `/api/*` routes require `x-api-key` header matching `APP_API_KEY`
- CORS is open (`*`) for hackathon; restrict in production
- Env vars validated at startup — server refuses to start with missing config
- Audit logs capture all external API interactions for compliance

## Scalability Considerations

- MongoDB with connection pooling (max 10)
- Redis via Upstash REST (stateless, no persistent connections)
- Socket.io single-node (for hackathon); use Redis adapter for multi-node
- DAG execution is async and non-blocking — API returns immediately
