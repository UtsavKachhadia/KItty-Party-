import { MongoClient } from 'mongodb';
import axios from 'axios';
import env from './backend/config/env.js';
import { decrypt } from './backend/src/utils/encryption.js';

async function listJiraProjects() {
  const secretKey = process.env.CREDENTIAL_SECRET || process.env.CREDENTIAL_ENCRYPTION_KEY;
  const client = new MongoClient(env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    const user = await db.collection('users').findOne({ email: 'admin@system.com' });
    
    if (!user || !user.integrations?.jira) {
      console.log("No Jira integration found for admin@system.com");
      return;
    }

    const encToken = user.integrations.jira.apiToken;
    let tokenStr;
    if (typeof encToken === 'string') {
      tokenStr = decrypt(JSON.parse(encToken), secretKey);
    } else {
      tokenStr = decrypt(encToken, secretKey);
    }

    const domain = user.integrations.jira.domain;
    let baseURL = domain;
    if (!baseURL.startsWith('http')) baseURL = `https://${baseURL}`;

    console.log(`Checking domain: ${baseURL}`);
    
    const authHeader = 'Basic ' + Buffer.from(`${user.email}:${tokenStr}`).toString('base64');
    
    const res = await axios.get(`${baseURL}/rest/api/3/project`, {
      headers: {
        Authorization: authHeader,
        Accept: 'application/json'
      }
    });

    console.log('--- AVAILABLE JIRA PROJECTS ---');
    for (const proj of res.data) {
      console.log(`Name: "${proj.name}", Key: "${proj.key}"`);
    }

  } catch (err) {
    console.error('Failed to fetch projects:', err.response?.data || err.message);
  } finally {
    await client.close();
  }
}

listJiraProjects();
