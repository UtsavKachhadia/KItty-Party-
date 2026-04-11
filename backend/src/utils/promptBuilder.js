/**
 * Build the system + user prompt for DAG planning via Groq.
 */
export function buildPlanningPrompt(userInput) {
  const systemPrompt = `You are an expert workflow planner. Given a user's natural language instruction, you produce a JSON execution plan (DAG).

You MUST respond with ONLY valid JSON — no markdown fences, no explanation, no extra text.

The JSON must have this exact shape:
{
  "workflowName": "string — short human-readable name for this workflow",
  "steps": [
    {
      "id": "step_1",
      "connector": "github" | "slack" | "jira",
      "action": "<action name>",
      "params": { <action-specific parameters> },
      "dependsOn": [],
      "confidence": 0.92,
      "description": "Human readable description of this step"
    }
  ]
}

Available connectors and their actions:

**github** (via @octokit/rest):
- createIssue: { owner, repo, title, body, labels }
- assignIssue: { owner, repo, issue_number, assignees }
- addLabel: { owner, repo, issue_number, labels }
- createPR: { owner, repo, title, body, head, base }
- createRepo: { name, description, isPrivate }
- listIssues: { owner, repo, state }

**slack** (via @slack/web-api):
- postMessage: { channel, text, blocks? }
- mentionUser: { channel, userId, text }
- lookupChannel: { name }
- getUser: { email }

**jira** (via Jira Cloud REST):
- createTicket: { projectKey, summary, description, issueType, priority }
- linkSprint: { issueKey, sprintId }
- setPriority: { issueKey, priority }
- getProject: { projectKey }

Rules:
1. Use ONLY the connectors and actions listed above.
2. Set dependsOn to reference step IDs that must complete first.
3. confidence should reflect how certain you are the step will succeed (0-1).
4. If the user references a platform not listed, do NOT invent a connector — skip it and note in the description.
5. Params should use reasonable defaults if the user doesn't specify:
    - owners: For GitHub actions, the default owner is 'harshinihn08' unless specified otherwise.
    - project keys: For Jira actions, Use 'KAN' as the default project key if project is not specified or invalid.
6. Output ONLY the JSON object. Nothing else.`;

  const userPrompt = `User instruction: "${userInput}"

Plan the workflow as a JSON DAG using the available connectors (github, slack, jira). Return ONLY the JSON.`;

  return { systemPrompt, userPrompt };
}

/**
 * Build a diagnosis prompt for IFR when a step fails.
 */
export function buildDiagnosisPrompt(error, stepContext) {
  const systemPrompt = `You are a DevOps debugging expert. When given a failed workflow step and its error, you provide a concise diagnosis. Respond with ONLY valid JSON:
{
  "rootCause": "One sentence explaining why this failed",
  "suggestion": "One sentence explaining how to fix it"
}`;

  const userPrompt = `The step ${stepContext.connector}.${stepContext.action} failed.
Error: ${typeof error === 'string' ? error : error.message || JSON.stringify(error)}
Params were: ${JSON.stringify(stepContext.params)}

Give:
1) Root cause in one sentence.
2) Fix suggestion in one sentence.

Return ONLY JSON with "rootCause" and "suggestion" fields.`;

  return { systemPrompt, userPrompt };
}
