# KItty-Party- Project Summary

## 📝 Project Objective
KItty-Party- is a high-performance automation orchestration platform. It allows users to define and execute complex, multi-step workflows (DAGs) that bridge the gap between developer tools like GitHub, communication platforms like Slack, and project management suites like Jira.

## 🏗️ Architecture

### Frontend
- **Framework**: React 18 with Vite.
- **Styling**: Tailwind CSS.
- **Key Modules**:
    - `AppShell.jsx`: Global layout and navigation wrapper.
    - `WorkflowPage.jsx`: Visual management of automation tasks.
    - `SettingsPage.jsx`: Secure management of service credentials.

### Backend
- **Server**: Express.js (Node.js).
- **ORM**: Mongoose (MongoDB).
- **Engine**: Custom DAG Executor (`/backend/src/routes/execute.js`).
- **Auth**: JWT-based (HMAC SHA256).

## ✨ Features
1. **Multi-Source Connectivity**: Seamlessly talk to GitHub, Slack, and Jira using user-provided tokens.
2. **Dependent Task Execution**: Define steps that wait for previous steps to succeed.
3. **Real-time Auditing**: Every action is logged in an `AuditLog` for debugging and compliance.
4. **Premium Aesthetics**: A "WOW" factor UI inspired by modern SaaS dashboards.

## 📅 Roadmap & Progress
- [x] Backend API Scaffolding
- [x] JWT Authentication System
- [x] Initial Connector Suite (GitHub, Slack, Jira)
- [x] DAG Execution Logic
- [x] Basic Frontend Shell
- [ ] Drag-and-Drop Workflow Builder (Planned)
- [ ] Advanced Logging/Monitoring Dashboard (In Progress)
