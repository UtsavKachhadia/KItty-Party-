import axios from 'axios';

const KNOWN_ACTIONS = ['createTicket', 'linkSprint', 'setPriority', 'getProject', 'getMyself'];

/**
 * Creates an Axios client for Jira from user-specific credentials.
 * Uses user.email + tokens.jira.key for Basic auth.
 * Uses tokens.jira.domain as the base URL.
 */
function getJiraClient(context) {
  const jiraConfig = context?.tokens?.jira;
  if (!jiraConfig?.key || !jiraConfig?.domain) {
    throw new Error('Jira credentials not configured for this user');
  }

  const email = context?.email;
  if (!email) {
    throw new Error('User email required for Jira authentication');
  }
  const authHeader =
    'Basic ' + Buffer.from(`${email}:${jiraConfig.key}`).toString('base64');

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
  async getMyself(client) {
    const res = await client.get('/rest/api/3/myself');
    return res.data;
  },

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
      const data = await handlers[action](client, params || {});
      return { success: true, data };
    } catch (err) {
      console.error(`❌ Jira Action Failed [${action}]:`, err.message);

      let errorMsg = err.message || 'Jira API call failed';
      const status = err.response?.status;

      if (status === 401) {
        errorMsg = "Unauthorized. Please check your Jira email and API Key (API Token) in settings.";
      } else if (status === 403) {
        errorMsg = "Forbidden. Ensure your user has permissions to access this Jira project or feature.";
      } else if (err.response?.data) {
        errorMsg =
          err.response.data.errorMessages?.join('; ') ||
          (err.response.data.errors ? JSON.stringify(err.response.data.errors) : errorMsg);
      }

      return { 
        success: false, 
        error: errorMsg, 
        status,
        details: err.response?.data || null 
      };
    }
  },

  isConfigured(context) {
    if (context) return Boolean(context?.tokens?.jira?.key && context?.tokens?.jira?.domain);
    return true; 
  },
};

export default jiraConnector;
