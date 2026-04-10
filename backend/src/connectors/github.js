import { Octokit } from '@octokit/rest';
import env from '../../config/env.js';

const octokit = new Octokit({ auth: env.GITHUB_TOKEN });

const KNOWN_ACTIONS = ['createIssue', 'assignIssue', 'addLabel', 'createPR', 'listIssues'];

const handlers = {
  async createIssue({ owner, repo, title, body, labels }) {
    const res = await octokit.issues.create({
      owner,
      repo,
      title,
      body: body || '',
      labels: labels || [],
    });
    return res.data;
  },

  async assignIssue({ owner, repo, issue_number, assignees }) {
    const res = await octokit.issues.addAssignees({
      owner,
      repo,
      issue_number: Number(issue_number),
      assignees: Array.isArray(assignees) ? assignees : [assignees],
    });
    return res.data;
  },

  async addLabel({ owner, repo, issue_number, labels }) {
    const res = await octokit.issues.addLabels({
      owner,
      repo,
      issue_number: Number(issue_number),
      labels: Array.isArray(labels) ? labels : [labels],
    });
    return res.data;
  },

  async createPR({ owner, repo, title, body, head, base }) {
    const res = await octokit.pulls.create({
      owner,
      repo,
      title,
      body: body || '',
      head,
      base: base || 'main',
    });
    return res.data;
  },

  async listIssues({ owner, repo, state }) {
    const res = await octokit.issues.listForRepo({
      owner,
      repo,
      state: state || 'open',
    });
    return res.data;
  },
};

const githubConnector = {
  name: 'github',
  KNOWN_ACTIONS,

  async execute(action, params) {
    try {
      if (!handlers[action]) {
        return { success: false, error: `Unknown GitHub action: ${action}` };
      }
      const data = await handlers[action](params);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'GitHub API call failed',
        status: err.status,
      };
    }
  },

  isConfigured() {
    return Boolean(env.GITHUB_TOKEN);
  },
};

export default githubConnector;
