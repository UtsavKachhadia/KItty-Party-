import { getConnector } from '../connectors/index.js';

/**
 * Known actions per connector for validation.
 */
const CONNECTOR_ACTIONS = {
  github: ['createIssue', 'assignIssue', 'addLabel', 'createPR', 'listIssues'],
  slack: ['postMessage', 'mentionUser', 'lookupChannel', 'getUser'],
  jira: ['createTicket', 'linkSprint', 'setPriority', 'getProject'],
};

/**
 * Required params per connector.action for completeness checking.
 */
const REQUIRED_PARAMS = {
  'github.createIssue': ['owner', 'repo', 'title'],
  'github.assignIssue': ['owner', 'repo', 'issue_number', 'assignees'],
  'github.addLabel': ['owner', 'repo', 'issue_number', 'labels'],
  'github.createPR': ['owner', 'repo', 'title', 'head'],
  'github.listIssues': ['owner', 'repo'],
  'slack.postMessage': ['channel', 'text'],
  'slack.mentionUser': ['channel', 'userId', 'text'],
  'slack.lookupChannel': ['name'],
  'slack.getUser': ['email'],
  'jira.createTicket': ['projectKey', 'summary'],
  'jira.linkSprint': ['issueKey', 'sprintId'],
  'jira.setPriority': ['issueKey', 'priority'],
  'jira.getProject': ['projectKey'],
};

/**
 * Scores each step in the DAG 0–1 and flags requiresApproval / autoExecute.
 */
export function scoreDAG(dag, availableConnectors) {
  const availableNames = new Set(
    availableConnectors
      ? Object.keys(availableConnectors)
      : ['github', 'slack', 'jira']
  );

  const scoredSteps = dag.steps.map((step) => {
    let confidence = 0.85;

    // Deduct 0.2 if connector is not available
    if (!availableNames.has(step.connector)) {
      confidence -= 0.2;
    }

    // Deduct 0.15 if action is not in the connector's known action list
    const knownActions = CONNECTOR_ACTIONS[step.connector] || [];
    if (!knownActions.includes(step.action)) {
      confidence -= 0.15;
    }

    // Deduct 0.1 if any required param is missing or empty
    const reqKey = `${step.connector}.${step.action}`;
    const requiredParams = REQUIRED_PARAMS[reqKey] || [];
    for (const param of requiredParams) {
      if (
        step.params[param] === undefined ||
        step.params[param] === null ||
        step.params[param] === ''
      ) {
        confidence -= 0.1;
        break; // Only deduct once
      }
    }

    // Add 0.1 if no dependencies (simpler step)
    if (!step.dependsOn || step.dependsOn.length === 0) {
      confidence += 0.1;
    }

    // Use LLM-provided confidence as a factor if available
    if (typeof step.confidence === 'number' && step.confidence > 0) {
      confidence = (confidence + step.confidence) / 2;
    }

    // Clamp between 0 and 1
    confidence = Math.max(0, Math.min(1, confidence));

    return {
      ...step,
      confidence: parseFloat(confidence.toFixed(3)),
      requiresApproval: confidence < 0.6,
      autoExecute: confidence >= 0.8,
    };
  });

  return { ...dag, steps: scoredSteps };
}
