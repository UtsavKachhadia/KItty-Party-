import { Octokit } from '@octokit/rest';

const KNOWN_ACTIONS = ['createIssue', 'assignIssue', 'addLabel', 'createPR', 'listIssues'];

/**
 * Creates an Octokit client from user-specific GitHub token.
 */
function getOctokitClient(user) {
  const token = user?.connectors?.github?.token;
  if (!token) {
    throw new Error('GitHub token not configured for this user');
  }
  return new Octokit({ auth: token });
}

const handlers = {
  async createIssue(octokit, { owner, repo, title, body, labels }) {
    const res = await octokit.issues.create({
      owner,
      repo,
      title,
      body: body || '',
      labels: labels || [],
    });
    return res.data;
  },

  async assignIssue(octokit, { owner, repo, issue_number, assignees }) {
    const res = await octokit.issues.addAssignees({
      owner,
      repo,
      issue_number: Number(issue_number),
      assignees: Array.isArray(assignees) ? assignees : [assignees],
    });
    return res.data;
  },

  async addLabel(octokit, { owner, repo, issue_number, labels }) {
    const res = await octokit.issues.addLabels({
      owner,
      repo,
      issue_number: Number(issue_number),
      labels: Array.isArray(labels) ? labels : [labels],
    });
    return res.data;
  },

  async createPR(octokit, { owner, repo, title, body, head, base }) {
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

  async listIssues(octokit, { owner, repo, state }) {
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

  async execute(action, params, user) {
    try {
      if (!handlers[action]) {
        return { success: false, error: `Unknown GitHub action: ${action}` };
      }
      const octokit = getOctokitClient(user);
      const data = await handlers[action](octokit, params);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'GitHub API call failed',
        status: err.status,
      };
    }
  },

  isConfigured(user) {
    if (user) return Boolean(user?.connectors?.github?.token);
    return true; // Connector code is always available
  },
};

export default githubConnector;
