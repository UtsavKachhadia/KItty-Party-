import { Octokit } from '@octokit/rest';
import env from './backend/config/env.js';

const octokit = new Octokit({ auth: env.GITHUB_TOKEN });

async function checkToken() {
  try {
    const res = await octokit.users.getAuthenticated();
    console.log("Authenticated as:", res.data.login);
    console.log("Scopes:", res.headers['x-oauth-scopes']);
  } catch (e) {
    console.error("GitHub Auth Error:", e.message);
  }
}

checkToken();
