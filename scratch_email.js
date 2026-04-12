import { sendInviteEmail } from './backend/src/services/emailService.js';
import env from './backend/config/env.js';

async function testEmail() {
  console.log("SMT USER:", env.SMTP_USER);
  console.log("SMT PASS length:", env.SMTP_PASS?.length);
  
  const result = await sendInviteEmail('utsav.kachhadia116@gmail.com', 'test-admin', 'utsav');
  console.log('Result:', result);
  process.exit(0);
}
testEmail();
