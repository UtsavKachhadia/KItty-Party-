import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function fetchJiraProjects() {
  const token = process.env.JIRA_API_TOKEN;
  const email = process.env.JIRA_EMAIL;
  const domain = process.env.JIRA_BASE_URL;

  if (!token || !email || !domain) {
    console.log("Missing Jira Env Variables.");
    return;
  }

  const authHeader = 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');
  let baseURL = domain;
  if (!baseURL.startsWith('http')) baseURL = `https://${baseURL}`;

  try {
    const res = await axios.get(`${baseURL}/rest/api/3/project`, {
      headers: {
        Authorization: authHeader,
        Accept: 'application/json'
      }
    });

    console.log('--- YOUR JIRA PROJECTS ---');
    for (const proj of res.data) {
      console.log(`Name: "${proj.name}", Key: "${proj.key}"`);
    }
  } catch (err) {
    console.error('Failed to fetch projects:', err.response?.data || err.message);
  }
}

fetchJiraProjects();
