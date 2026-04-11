const http = require('http');

function request(method, path, body = undefined, token = undefined) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request({
      hostname: 'localhost',
      port: 5002,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data && { 'Content-Length': Buffer.byteLength(data) }),
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    }, res => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(resBody) });
        } catch {
          resolve({ status: res.statusCode, data: resBody });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  try {
    console.log('--- 2.1 POST /auth/signup ---');
    const signupRes = await request('POST', '/api/auth/signup', {
      username: 'testuser',
      email: 'test@example.com',
      password: 'test123',
      confirmPassword: 'test123',
      connectors: {
        github: { token: 'ghp_testtoken' },
        slack: { token: 'xoxb-testtoken' },
        jira: { apiKey: 'jira_key', domain: 'myorg.atlassian.net' }
      }
    });
    console.log('Signup status:', signupRes.status);
    console.log('Signup user role:', signupRes.data.user?.role);
    console.log('Signup token exists:', !!signupRes.data.token);

    console.log('\n--- 2.2 POST /auth/signup Validation Failures ---');
    const failMissing = await request('POST', '/api/auth/signup', { email: 'bad@test.com', password: '123' });
    console.log('Missing username status:', failMissing.status);
    console.log('Missing username body:', failMissing.data);

    console.log('\n--- 2.3 POST /auth/login Regular User ---');
    const loginRes = await request('POST', '/api/auth/login', {
      email: 'test@example.com',
      password: 'test123'
    });
    console.log('Login status:', loginRes.status);
    console.log('Login role:', loginRes.data.user?.role);

    console.log('\n--- 2.4 POST /auth/login Admin User ---');
    const adminLoginRes = await request('POST', '/api/auth/login', {
      email: 'admin@system.com',
      password: 'Admin@123'
    });
    console.log('Admin login status:', adminLoginRes.status);
    console.log('Admin login role:', adminLoginRes.data.user?.role);

    console.log('\n--- 3.1 & 3.2 requireAuth Middleware ---');
    const authTest1 = await request('GET', '/api/workflow/history', undefined, adminLoginRes.data.token);
    console.log('Valid token /api/workflow/history status:', authTest1.status);

    const authTest2 = await request('GET', '/api/workflow/history', undefined, 'invalidtoken_123');
    console.log('Invalid token /api/workflow/history status:', authTest2.status);
    
    console.log('\n--- 5 Connector Test Endpoints ---');
    const githubTest = await request('POST', '/api/connectors/test/github', { token: 'invalid' });
    console.log('Github test invalid token success:', githubTest.data.success);
    
    const slackTest = await request('POST', '/api/connectors/test/slack', { token: 'invalid' });
    console.log('Slack test invalid token success:', slackTest.data.success);
    
    const jiraTest = await request('POST', '/api/connectors/test/jira', { apiKey: 'invalid', domain: 'x' });
    console.log('Jira test invalid token success:', jiraTest.data.success);

  } catch (err) {
    console.error(err);
  }
})();
