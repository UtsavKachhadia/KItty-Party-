import axios from 'axios';
import env from '../../config/env.js';

const authHeader =
  'Basic ' + Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString('base64');

const client = axios.create({
  baseURL: env.JIRA_BASE_URL,
  headers: {
    Authorization: authHeader,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 10000,
});

const KNOWN_ACTIONS = ['createTicket', 'linkSprint', 'setPriority', 'getProject'];

const handlers = {
  async createTicket({ projectKey, summary, description, issueType, priority }) {
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

const jiraConnector = {
  name: 'jira',
  KNOWN_ACTIONS,

  async execute(action, params) {
    try {
      if (!handlers[action]) {
        return { success: false, error: `Unknown Jira action: ${action}` };
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
    return Boolean(env.JIRA_BASE_URL && env.JIRA_EMAIL && env.JIRA_API_TOKEN);
  },
};

export default jiraConnector;
