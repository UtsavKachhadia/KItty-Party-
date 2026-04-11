import axios from 'axios';

const KNOWN_ACTIONS = ['createTicket', 'linkSprint', 'setPriority', 'getProject'];

/**
 * Creates an Axios client for Jira from user-specific credentials.
 * Uses user.email + user.connectors.jira.apiKey for Basic auth.
 * Uses user.connectors.jira.domain as the base URL.
 */
function getJiraClient(user) {
  const jiraConfig = user?.connectors?.jira;
  if (!jiraConfig?.apiKey || !jiraConfig?.domain) {
    throw new Error('Jira credentials not configured for this user');
  }

  const email = user.email;
  const authHeader =
    'Basic ' + Buffer.from(`${email}:${jiraConfig.apiKey}`).toString('base64');

  // Normalize domain — ensure it starts with https://
  let baseURL = jiraConfig.domain;
  if (!baseURL.startsWith('http')) {
    baseURL = `https://${baseURL}`;
  }

  return axios.create({
    baseURL,
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout: 10000,
  });
}

const handlers = {
  async createTicket(client, { projectKey, summary, description, issueType, priority }) {
    const body = {
      fields: {
        project: { key: projectKey },
        summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: description || '' }],
            },
          ],
        },
        issuetype: { name: issueType || 'Task' },
      },
    };
    if (priority) {
      body.fields.priority = { name: priority };
    }
    const res = await client.post('/rest/api/3/issue', body);
    return { key: res.data.key, id: res.data.id, self: res.data.self };
  },

  async linkSprint(client, { issueKey, sprintId }) {
    const res = await client.post(`/rest/agile/1.0/sprint/${sprintId}/issue`, {
      issues: [issueKey],
    });
    return { linked: true, sprintId, issueKey, status: res.status };
  },

  async setPriority(client, { issueKey, priority }) {
    const res = await client.put(`/rest/api/3/issue/${issueKey}`, {
      fields: { priority: { name: priority } },
    });
    return { updated: true, issueKey, priority, status: res.status };
  },

  async getProject(client, { projectKey }) {
    const res = await client.get(`/rest/api/3/project/${projectKey}`);
    return { key: res.data.key, name: res.data.name, id: res.data.id };
  },
};

const jiraConnector = {
  name: 'jira',
  KNOWN_ACTIONS,

  async execute(action, params, user) {
    try {
      if (!handlers[action]) {
        return { success: false, error: `Unknown Jira action: ${action}` };
      }
      const client = getJiraClient(user);
      const data = await handlers[action](client, params);
      return { success: true, data };
    } catch (err) {
      const msg =
        err.response?.data?.errorMessages?.join('; ') ||
        err.response?.data?.errors
          ? JSON.stringify(err.response.data.errors)
          : err.message || 'Jira API call failed';
      return { success: false, error: msg, status: err.response?.status };
    }
  },

  isConfigured(user) {
    if (user) return Boolean(user?.connectors?.jira?.apiKey && user?.connectors?.jira?.domain);
    return true; // Connector code is always available
  },
};

export default jiraConnector;
