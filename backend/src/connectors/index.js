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
 */
export function getConnectorHealth() {
  const health = {};
  for (const [name, connector] of Object.entries(registry)) {
    health[name] = {
      configured: connector.isConfigured(),
      actions: connector.KNOWN_ACTIONS,
    };
  }
  return health;
}

export default registry;
