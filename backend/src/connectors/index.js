import createGithubConnector from './github.js';
import createSlackConnector from './slack.js';
import createJiraConnector from './jira.js';
import env from '../../config/env.js';

/**
 * Creates a connector registry for a specific user's credentials.
 * Each connector is instantiated with the user's own decrypted tokens.
 *
 * @param {Object} userCredentials - Decrypted credential object { github, slack, jira }
 * @returns {Object} { github, slack, jira } connector instances
 */
export function getConnectors(userCredentials) {
  return {
    github: createGithubConnector(userCredentials?.github || {}),
    slack: createSlackConnector(userCredentials?.slack || {}),
    jira: createJiraConnector(userCredentials?.jira || {}),
  };
}

/**
 * Returns per-user connector health (configured status + available actions).
 * @param {Object} userCredentials - Decrypted credential object
 * @returns {Object}
 */
export function getConnectorHealth(userCredentials) {
  const conns = userCredentials ? getConnectors(userCredentials) : getDefaultConnectors();
  const health = {};
  for (const [name, connector] of Object.entries(conns)) {
    health[name] = {
      configured: connector.isConfigured(),
      actions: connector.KNOWN_ACTIONS,
    };
  }
  return health;
}

/**
 * Creates connectors using the default env-level tokens.
 * Used for backwards compatibility and for the admin account.
 * @returns {Object} { github, slack, jira }
 */
export function getDefaultConnectors() {
  return getConnectors({
    github: { accessToken: env.GITHUB_TOKEN },
    slack: { botToken: env.SLACK_BOT_TOKEN },
    jira: { baseUrl: env.JIRA_BASE_URL, email: env.JIRA_EMAIL, apiToken: env.JIRA_API_TOKEN },
  });
}

// Default export for backwards compatibility during migration
export default getDefaultConnectors();
