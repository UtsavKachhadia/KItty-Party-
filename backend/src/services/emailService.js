import nodemailer from 'nodemailer';
import env from '../../config/env.js';

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  // Use real SMTP if configured (e.g. Gmail App Password)
  if (env.SMTP_USER && env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: env.SMTP_USER.trim(),
        pass: env.SMTP_PASS.trim(),
      },
    });
    console.log('📧 Email transport ready (Live SMTP using Gmail)');
    return transporter;
  }

  // Fallback: Create Ethereal test account automatically
  const testAccount = await nodemailer.createTestAccount();

  transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  console.log('📧 Email transport ready (Ethereal test account)');
  return transporter;
}

/**
 * Sends a welcome / confirmation email after successful registration.
 * Uses Ethereal in dev — preview URL logged to console.
 *
 * @param {string} toEmail - Recipient email
 * @param {string} username - User's display name
 */
export async function sendWelcomeEmail(toEmail, username) {
  try {
    const transport = await getTransporter();

    const info = await transport.sendMail({
      from: '"MCP Gateway" <noreply@mcp-gateway.dev>',
      to: toEmail,
      subject: '🚀 Welcome to MCP Gateway — Account Created',
      text: `Hi ${username},\n\nYour MCP Gateway account has been created successfully.\n\nYou can now log in and start creating agentic workflows across GitHub, Slack, and Jira.\n\nBest,\nMCP Gateway Team`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #131313; color: #E5E2E1; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 32px;">⚡</span>
          </div>
          <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 8px 0; text-align: center;">
            Welcome to MCP Gateway
          </h1>
          <p style="font-size: 13px; color: #6C757D; text-align: center; margin: 0 0 24px 0;">
            Your account has been created successfully.
          </p>
          <div style="background: #1C1B1B; border: 1px solid #414755; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="font-size: 13px; margin: 0 0 8px 0;">Hi <strong>${username}</strong>,</p>
            <p style="font-size: 13px; color: #C1C6D7; margin: 0;">
              You can now log in and start creating agentic workflows across GitHub, Slack, and Jira.
              Configure your connector tokens in Settings to get started.
            </p>
          </div>
          <div style="text-align: center;">
            <a href="https://finalhackathondeployedproject.vercel.app/" style="display: inline-block; background: #007AFF; color: #fff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-size: 13px; font-weight: 600;">
              Open Dashboard
            </a>
          </div>
          <p style="font-size: 10px; color: #414755; text-align: center; margin-top: 24px;">
            MCP Gateway v1.0 — Agentic Workflow Execution
          </p>
        </div>
      `,
    });

    // Log the Ethereal preview URL so devs can see the email
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📧 Welcome email sent! Preview: ${previewUrl}`);
    }

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (err) {
    console.error('📧 Email send failed:', err.message);
    return { success: false, error: err.message };
  }
}

export async function sendInviteEmail(toEmail, initiatorUsername, targetIdentifier) {
  try {
    const transport = await getTransporter();

    const info = await transport.sendMail({
      from: '"KItty-Party" <noreply@mcp-gateway.dev>',
      to: toEmail,
      subject: `Action Required: Workflow Request from ${initiatorUsername}`,
      text: `Hi ${targetIdentifier},\n\n${initiatorUsername} wants to run a workflow on your behalf via KItty-Party.\n\nPlease log in or create an account to review and approve this execution.\n\nBest,\nKItty-Party Team`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #131313; color: #E5E2E1; border-radius: 12px;">
          <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 8px 0; text-align: center;">
            Workflow Approval Required
          </h1>
          <p style="font-size: 13px; color: #6C757D; text-align: center; margin: 0 0 24px 0;">
            Waiting for your authorization
          </p>
          <div style="background: #1C1B1B; border: 1px solid #414755; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="font-size: 13px; margin: 0 0 8px 0;">Hi <strong>${targetIdentifier}</strong>,</p>
            <p style="font-size: 13px; color: #C1C6D7; margin: 0;">
              <strong>@${initiatorUsername}</strong> has requested to execute a workflow on your behalf using KItty-Party.
              You will need to review the steps and approve the workflow before it can modify your external apps (like GitHub or Slack).
            </p>
          </div>
          <div style="text-align: center;">
            <a href="http://localhost:5173" style="display: inline-block; background: #007AFF; color: #fff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-size: 13px; font-weight: 600;">
              Review Request
            </a>
          </div>
        </div>
      `,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📧 Invite email sent! Preview: ${previewUrl}`);
    }

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (err) {
    console.error('📧 Invite email send failed:', err.message);
    return { success: false, error: err.message };
  }
}

export default { sendWelcomeEmail, sendInviteEmail };
