import githubConnector from './github.js';
import slackConnector from './slack.js';
import jiraConnector from './jira.js';

const registry = {
  github: githubConnector,
  slack: slackConnector,
  jira: jiraConnector,
};

/**
 * Get a connector by name. Returns undefined if not found.
 */
export function getConnector(name) {
  return registry[name] || undefined;
}

/**
 * Check health / configuration status of every registered connector.
 * Without a user context, reports whether the connector code is available.
 * With a user context, reports whether the user has configured that connector.
 */
export function getConnectorHealth(user) {
  const health = {};
  for (const [name, connector] of Object.entries(registry)) {
    health[name] = {
      configured: connector.isConfigured(user),
      actions: connector.KNOWN_ACTIONS,
    };
  }
  return health;
}

export default registry;
