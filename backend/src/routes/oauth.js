import { Router } from 'express';
import { githubOAuth } from '../connectors/githubOAuth.js';
import { slackOAuth } from '../connectors/slackOAuth.js';
import requireAuth from '../middleware/auth.js';

const router = Router();

// Assuming the user needs to be authenticated to start OAuth integration
// However, standard OAuth redirects usually don't carry the frontend's JWT headers well.
// So userId might need to be passed via query string `?userId=...` if jwt token isn't in cookies, 
// or requireAuth middleware might support query-based token. Let's assume standard behavior.

// If the prompt implies getting userId from a queryParam or rely on token:
router.get('/github', requireAuth, (req, res) => {
  const url = githubOAuth.getAuthorizationUrl(req.user.userId);
  res.redirect(url);
});

router.get('/github/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    await githubOAuth.exchangeCodeForToken(code, state);
    res.send('GitHub integration successful! You can close this tab.');
  } catch (error) {
    console.error('GitHub OAuth Error:', error);
    res.status(500).send('OAuth Error');
  }
});

router.get('/slack', requireAuth, (req, res) => {
  const url = slackOAuth.getAuthorizationUrl(req.user.userId);
  res.redirect(url);
});

router.get('/slack/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    await slackOAuth.exchangeCodeForToken(code, state);
    res.send('Slack integration successful! You can close this tab.');
  } catch (error) {
    console.error('Slack OAuth Error:', error);
    res.status(500).send('OAuth Error');
  }
});

export default router;
