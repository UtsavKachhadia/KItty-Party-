# Agentic MCP Gateway — API Reference

## Authentication

All `/api/*` endpoints require the `x-api-key` header:

```
x-api-key: hackathon-secret
```

The `GET /health` endpoint does **not** require authentication.

---

## Endpoints

### Health Check

```
GET /health
```

**Response** `200 OK`
```json
{
  "status": "ok",
  "uptime": 123.456,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

### Run Workflow

```
POST /api/workflow/run
```

Creates a DAG from natural language input and starts execution.

**Request Body**
```json
{
  "userInput": "Create a GitHub issue for login bug, notify #engineering on Slack, create a Jira ticket with High priority",
  "options": {
    "confidenceThreshold": 0.7
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userInput` | string | ✅ | Natural language instruction |
| `options.confidenceThreshold` | number | ❌ | Override default threshold (0.6) to flag steps for approval |

**Response** `202 Accepted`
```json
{
  "runId": "665a1b2c3d4e5f6a7b8c9d0e",
  "dag": {
    "workflowName": "Bug Report Flow",
    "steps": [
      {
        "id": "step_1",
        "connector": "github",
        "action": "createIssue",
        "params": { "owner": "myorg", "repo": "myapp", "title": "Login bug", "body": "..." },
        "dependsOn": [],
        "confidence": 0.925,
        "requiresApproval": false,
        "autoExecute": true,
        "description": "Create GitHub issue for login bug"
      }
    ]
  },
  "status": "running"
}
```

---

### Workflow History

```
GET /api/workflow/history
```

Returns the last 20 runs, newest first.

**Response** `200 OK`
```json
{
  "history": [
    {
      "runId": "665a1b2c3d4e5f6a7b8c9d0e",
      "userInput": "Create a GitHub issue...",
      "status": "completed",
      "stepsTotal": 3,
      "stepsCompleted": 3,
      "stepsFailed": 0,
      "startedAt": "2025-01-15T10:30:00.000Z",
      "endedAt": "2025-01-15T10:30:05.000Z"
    }
  ]
}
```

---

### Replay Workflow

```
POST /api/workflow/replay/:runId
```

Clones a previous run and re-executes it with optional parameter overrides.

**Path Params**
| Param | Description |
|-------|-------------|
| `runId` | MongoDB ObjectId of the original run |

**Request Body**
```json
{
  "newParams": {
    "step_1": { "title": "Updated title" },
    "step_3": { "priority": "Critical" }
  }
}
```

**Response** `202 Accepted`
```json
{
  "newRunId": "665b2c3d4e5f6a7b8c9d0f1",
  "dag": { ... },
  "status": "running"
}
```

---

### Approve Step

```
POST /api/execute/approve
```

Approves a step that requires human approval, allowing the DAG runner to continue.

**Request Body**
```json
{
  "runId": "665a1b2c3d4e5f6a7b8c9d0e",
  "stepId": "step_2"
}
```

**Response** `200 OK`
```json
{
  "approved": true,
  "runId": "665a1b2c3d4e5f6a7b8c9d0e",
  "stepId": "step_2"
}
```

---

### Reject Step

```
POST /api/execute/reject
```

Rejects a step, causing the DAG runner to skip it.

**Request Body**
```json
{
  "runId": "665a1b2c3d4e5f6a7b8c9d0e",
  "stepId": "step_2"
}
```

**Response** `200 OK`
```json
{
  "rejected": true,
  "runId": "665a1b2c3d4e5f6a7b8c9d0e",
  "stepId": "step_2"
}
```

---

### Audit Log

```
GET /api/audit/:runId
```

Returns all audit log entries for a run.

**Response** `200 OK`
```json
{
  "runId": "665a1b2c3d4e5f6a7b8c9d0e",
  "totalEntries": 3,
  "logs": [
    {
      "_id": "665c...",
      "runId": "665a...",
      "stepId": "step_1",
      "connector": "github",
      "action": "createIssue",
      "request": { "owner": "myorg", "repo": "myapp", "title": "Login bug" },
      "response": { "id": 42, "number": 123, "html_url": "..." },
      "success": true,
      "errorMessage": null,
      "durationMs": 847,
      "timestamp": "2025-01-15T10:30:01.000Z"
    }
  ]
}
```

---

### Connector Health

```
GET /api/connectors/health
```

Returns configuration status for each connector.

**Response** `200 OK`
```json
{
  "github": {
    "configured": true,
    "actions": ["createIssue", "assignIssue", "addLabel", "createPR", "listIssues"]
  },
  "slack": {
    "configured": true,
    "actions": ["postMessage", "mentionUser", "lookupChannel", "getUser"]
  },
  "jira": {
    "configured": false,
    "actions": ["createTicket", "linkSprint", "setPriority", "getProject"]
  }
}
```

---

## Socket.io Events Reference

Connect to the Socket.io server at `ws://localhost:3001`.

### Events Emitted by Server

| Event | Payload | Description |
|-------|---------|-------------|
| `step:started` | `{ runId, stepId, connector, action, confidence, description, timestamp }` | A step has begun execution |
| `step:completed` | `{ runId, stepId, result, timestamp }` | A step completed successfully |
| `step:failed` | `{ runId, stepId, error, diagnosis, timestamp }` | A step failed (may include IFR diagnosis) |
| `step:approval_required` | `{ runId, stepId, connector, action, description, params, confidence, timestamp }` | A step needs human approval before executing |
| `workflow:completed` | `{ runId, summary: { totalSteps, completedSteps }, timestamp }` | All steps in the DAG completed |
| `workflow:failed` | `{ runId, error: { message, failedStepIds }, timestamp }` | Workflow finished with one or more failures |

### Example Socket.io Client

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

socket.on("step:started", (data) => {
  console.log(`Step ${data.stepId} started: ${data.connector}.${data.action}`);
});

socket.on("step:completed", (data) => {
  console.log(`Step ${data.stepId} completed:`, data.result);
});

socket.on("step:failed", (data) => {
  console.error(`Step ${data.stepId} failed:`, data.error);
  if (data.diagnosis) console.log("Diagnosis:", data.diagnosis);
});

socket.on("step:approval_required", (data) => {
  console.log(`Step ${data.stepId} needs approval:`, data.description);
  // Call POST /api/execute/approve or /reject
});

socket.on("workflow:completed", (data) => {
  console.log("Workflow done!", data.summary);
});

socket.on("workflow:failed", (data) => {
  console.error("Workflow failed:", data.error);
});
```

---

## Error Responses

All errors follow this shape:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

| HTTP Status | Code | Meaning |
|-------------|------|---------|
| `400` | `INVALID_INPUT` | Missing or malformed request data |
| `401` | `AUTH_FAILED` | Missing or invalid `x-api-key` header |
| `404` | `NOT_FOUND` | Requested resource doesn't exist |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

The `details` field is only included in development mode (`NODE_ENV=development`).
