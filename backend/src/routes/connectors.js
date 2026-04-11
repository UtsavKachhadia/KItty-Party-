import { Router } from 'express';
import { Octokit } from '@octokit/rest';
import { WebClient } from '@slack/web-api';
import axios from 'axios';
import { getConnectorHealth } from '../connectors/index.js';
import { getUserTokens, saveUserTokens } from '../services/credentialService.js';
import requireAuth from '../middleware/auth.js';

const router = Router();

// Apply auth middleware to all connector routes
router.use(requireAuth);

/**
 * GET /api/connectors/health
 * Returns configuration status and available actions for each connector for the logged-in user.
 */
router.get('/health', async (req, res, next) => {
  try {
    const userTokens = await getUserTokens(req.user.userId);
    const health = getConnectorHealth({ email: req.user.email, tokens: userTokens });

    // Enrich with masked tokens/domains for the settings UI
    if (userTokens.github) {
      health.github.maskedToken = `ghp_********************${userTokens.github.slice(-4)}`;
    }
    if (userTokens.slack) {
      health.slack.maskedToken = `xoxb-********************${userTokens.slack.slice(-4)}`;
    }
    if (userTokens.jiraKey) {
      health.jira.maskedToken = `************************${userTokens.jiraKey.slice(-4)}`;
      health.jira.domain = userTokens.jiraDomain;
    }

    return res.json(health);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/connectors/save
 * Saves user connector configurations.
 */
router.post('/save', async (req, res, next) => {
  try {
    const { github, slack, jira } = req.body;
    await saveUserTokens(req.user.userId, {
      github: github?.token,
      slack: slack?.token,
      jiraKey: jira?.apiKey,
      jiraDomain: jira?.domain,
    });
    return res.json({ success: true, message: 'Settings saved.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/connectors/test/github
 * Verifies a GitHub Personal Access Token by calling the GitHub API.
 */
router.post('/test/github', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }

    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.users.getAuthenticated();
    return res.json({
      success: true,
      message: `Connected as ${data.login}`,
    });
  } catch (err) {
    return res.json({
      success: false,
      message: err.message || 'GitHub authentication failed',
    });
  }
});

/**
 * POST /api/connectors/test/slack
 * Verifies a Slack Bot Token by calling the Slack API.
 */
router.post('/test/slack', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }

    const web = new WebClient(token);
    const result = await web.auth.test();
    return res.json({
      success: true,
      message: `Connected to ${result.team} as ${result.user}`,
    });
  } catch (err) {
    return res.json({
      success: false,
      message: err.message || 'Slack authentication failed',
    });
  }
});

/**
 * POST /api/connectors/test/jira
 * Verifies Jira API credentials by calling the Jira API.
 */
router.post('/test/jira', async (req, res, next) => {
  try {
    const { apiKey, domain, email } = req.body;
    if (!apiKey || !domain) {
      return res.status(400).json({ success: false, message: 'API key and domain are required' });
    }

    // Use requested email or fallback to logged in user's email
    const authEmail = email || req.user.email;
    const authHeader = 'Basic ' + Buffer.from(`${authEmail}:${apiKey}`).toString('base64');

    let baseURL = domain;
    if (!baseURL.startsWith('http')) {
      baseURL = `https://${baseURL}`;
    }

    const response = await axios.get(`${baseURL}/rest/api/3/myself`, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 10000,
    });

    return res.json({
      success: true,
      message: `Connected as ${response.data.displayName || response.data.emailAddress || 'Jira user'}`,
    });
  } catch (err) {
    const msg =
      err.response?.data?.message ||
      err.response?.data?.errorMessages?.join('; ') ||
      err.message ||
      'Jira authentication failed';
    return res.json({
      success: false,
      message: msg,
    });
  }
});

export default router;
