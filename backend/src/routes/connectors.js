import { Router } from 'express';
import { Octokit } from '@octokit/rest';
import { WebClient } from '@slack/web-api';
import axios from 'axios';
import { getConnectorHealth } from '../connectors/index.js';

const router = Router();

/**
 * GET /api/connectors/health
 * Returns configuration status and available actions for each connector.
 */
router.get('/health', async (req, res, next) => {
  try {
    const health = getConnectorHealth();
    return res.json(health);
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

    // Use provided email or a fallback for testing
    const authEmail = email || 'test@test.com';
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
