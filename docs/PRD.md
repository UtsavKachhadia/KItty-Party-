# Agentic MCP Gateway — Product Requirements Document

## Problem Statement

Modern development teams work across multiple platforms — GitHub for code, Slack for communication, Jira for project management. Coordinating actions across these tools is manual, error-prone, and time-consuming. A developer filing a bug might need to:

1. Create a GitHub issue
2. Post a notification to the team Slack channel
3. Create a Jira ticket for tracking
4. Assign priority and sprint

Each step requires switching tools, copying data, and manual coordination.

## Solution

**Agentic MCP Gateway** is a natural language workflow automation system. Users type a plain-English instruction, and an LLM plans and executes a directed acyclic graph (DAG) of tasks across GitHub, Slack, and Jira — with live progress updates, confidence scoring, and intelligent failure recovery.

## User Flow

1. **Input**: User types a natural language instruction (e.g., *"Create a GitHub issue for the login bug, notify #engineering on Slack, and create a Jira ticket with high priority"*)
2. **Planning**: The LLM (Groq / LLaMA 3.3 70B) parses the instruction and generates a DAG of discrete steps
3. **Scoring**: Each step is scored for confidence (0–1). Low-confidence steps require human approval
4. **Execution**: The DAG runner executes steps in topological order, calling the appropriate connector for each
5. **Live Updates**: Socket.io emits real-time events for each step (started, completed, failed, approval required)
6. **Recovery**: If a step fails, the Intelligent Failure Recovery (IFR) engine retries transient errors, diagnoses failures via LLM, or escalates
7. **Audit**: Every connector call is logged with full request/response payloads for traceability

## MVP Features

- **Natural Language Input** → LLM-planned DAG
- **Multi-Platform Connectors**: GitHub, Slack, Jira
- **Confidence Scoring** with approval gates for low-confidence steps
- **DAG Execution Engine** with topological ordering
- **Intelligent Failure Recovery** (3-tier: retry → diagnose → escalate)
- **Real-Time Socket.io Events** for frontend integration
- **Workflow Replay** — re-run previous workflows with optional param overrides
- **Full Audit Trail** — every API call logged with duration and payloads
- **Connector Health Dashboard** — check which integrations are configured

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ (ES modules) |
| Framework | Express.js |
| LLM | Groq Cloud (LLaMA 3.3 70B Versatile) |
| Database | MongoDB Atlas (Mongoose ODM) |
| Cache / Signaling | Upstash Redis (REST API) |
| Real-time | Socket.io |
| GitHub | @octokit/rest |
| Slack | @slack/web-api |
| Jira | Axios + Jira Cloud REST API v3 |
| Auth | API key (x-api-key header) |

## Deployment Targets

- **Development**: Local Node.js with `npm run dev` (nodemon)
- **Production**: Any Node.js hosting (Railway, Render, Fly.io, AWS EC2)
- **Database**: MongoDB Atlas (free tier)
- **Cache**: Upstash Redis (free tier)
- **LLM**: Groq Cloud (free tier)

## Success Criteria

- User can type a natural language instruction and see a DAG generated within 3 seconds
- DAG executes across all configured connectors with live socket events
- Failed steps are retried or diagnosed automatically
- Full audit trail available for every execution
- System is extensible — adding a new connector requires only a new file in `connectors/`
