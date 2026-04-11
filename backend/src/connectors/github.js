import { Octokit } from '@octokit/rest';

const KNOWN_ACTIONS = [
  'createIssue', 
  'assignIssue', 
  'addLabel', 
  'createPR', 
  'listIssues', 
  'createRepo', 
  'createRepoInOrg',
  'getCurrentUser'
];

/**
 * Creates an Octokit client from user-specific GitHub token.
 */
function getOctokitClient(context) {
  const token = context?.tokens?.github;
  if (!token) {
    throw new Error('GitHub token not configured for this user');
  }
  return new Octokit({ 
    auth: token,
    headers: {
      accept: 'application/vnd.github+json'
    }
  });
}

const handlers = {
  async getCurrentUser(octokit) {
    const res = await octokit.users.getAuthenticated();
    return res.data;
  },

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

  async createRepo(octokit, { name, description, private: isPrivate }) {
    // Note: creates repo for the authenticated user (POST /user/repos)
    const res = await octokit.repos.createForAuthenticatedUser({
      name,
      description: description || '',
      private: Boolean(isPrivate),
    });
    return res.data;
  },

  async createRepoInOrg(octokit, { org, name, description, private: isPrivate }) {
    // Note: creates repo in an organization (POST /orgs/{org}/repos)
    const res = await octokit.repos.createInOrg({
      org,
      name,
      description: description || '',
      private: Boolean(isPrivate),
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
      const data = await handlers[action](octokit, params || {});
      return { success: true, data };
    } catch (err) {
      console.error(`❌ GitHub Action Failed [${action}]:`, err.message);
      
      // Handle cases where token might be classic but lacks correct scope
      const errorMsg = err.status === 404 
        ? `Resource not found or insufficient token permissions (404). Ensure your PAT has 'repo' scope (classic) or 'Administration: Read & Write' (fine-grained).`
        : err.message || 'GitHub API call failed';

      return {
        success: false,
        error: errorMsg,
        status: err.status,
      };
    }
  },

  isConfigured(context) {
    if (context) return Boolean(context?.tokens?.github);
    return true; 
  },
};

export default githubConnector;
