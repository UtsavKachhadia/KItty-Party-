import axios from 'axios';

const KNOWN_ACTIONS = ['createTicket', 'linkSprint', 'setPriority', 'getProject'];

/**
 * Factory function that creates a Jira connector instance
 * using the provided user credentials.
 * @param {Object} credentials - { baseUrl, email, apiToken }
 * @returns {Object} Connector with execute() and isConfigured()
 */
export default function createJiraConnector(credentials) {
  const baseUrl = credentials?.baseUrl;
  const email = credentials?.email;
  const apiToken = credentials?.apiToken;

  let client = null;
  if (baseUrl && email && apiToken) {
    const authHeader = 'Basic ' + Buffer.from(`${email}:${apiToken}`).toString('base64');
    client = axios.create({
      baseURL: baseUrl,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 10000,
    });
  }

  const handlers = {
    async createTicket({ projectKey, summary, description, issueType, priority }) {
      let finalIssueType = issueType || 'Task';
      if (!['Epic', 'Subtask', 'Task', 'Story'].includes(finalIssueType)) {
        finalIssueType = 'Task';
      }

      const body = {
        fields: {
          project: { key: projectKey === 'KITT' || !projectKey ? 'KAN' : projectKey },
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
          issuetype: { name: finalIssueType },
        },
      };
      if (priority) {
        body.fields.priority = { name: priority };
      }
      const res = await client.post('/rest/api/3/issue', body);
      return { key: res.data.key, id: res.data.id, self: res.data.self };
    },

    async linkSprint({ issueKey, sprintId }) {
      const res = await client.post(`/rest/agile/1.0/sprint/${sprintId}/issue`, {
        issues: [issueKey],
      });
      return { linked: true, sprintId, issueKey, status: res.status };
    },

    async setPriority({ issueKey, priority }) {
      const res = await client.put(`/rest/api/3/issue/${issueKey}`, {
        fields: { priority: { name: priority } },
      });
      return { updated: true, issueKey, priority, status: res.status };
    },

    async getProject({ projectKey }) {
      const res = await client.get(`/rest/api/3/project/${projectKey}`);
      return { key: res.data.key, name: res.data.name, id: res.data.id };
    },
  };

  return {
    name: 'jira',
    KNOWN_ACTIONS,

    async execute(action, params) {
      try {
        if (!handlers[action]) {
          return { success: false, error: `Unknown Jira action: ${action}` };
        }
        if (!client) {
          return { success: false, error: 'Jira connector not configured. Please add your credentials in Settings.' };
        }
        const data = await handlers[action](params);
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

    isConfigured() {
      return Boolean(baseUrl && email && apiToken);
    },
  };
}
