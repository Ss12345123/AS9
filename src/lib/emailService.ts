import { Resend } from 'resend';
import { config } from '../config';

const resendApiKey = process.env.RESEND_API_KEY || config.resendApiKey;

// Initialize Resend lazily and safely to avoid crashing if the key is missing on startup
let resendInstance: Resend | null = null;

export function getResendClient(): Resend | null {
  if (!resendInstance && resendApiKey) {
    try {
      resendInstance = new Resend(resendApiKey);
    } catch (error) {
      console.error("❌ [Resend Initialization Error]", error);
    }
  }
  return resendInstance;
}

const FROM_EMAIL = 'onboarding@resend.dev';

/**
 * Sends a account verification email using Resend.
 */
export async function sendVerificationEmail(to: string, token: string): Promise<boolean> {
  const client = getResendClient();
  const subject = 'Verify Your Gold AI Notification Email';
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify Your Email</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #050506;
      color: #e4e4e7;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      background-color: #050506;
      padding: 40px 20px;
    }
    .container {
      max-width: 500px;
      margin: 0 auto;
      background-color: #09090b;
      border: 1px solid #18181b;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    .header {
      background-color: #12110d;
      border-bottom: 2px solid #eab308;
      padding: 25px;
      text-align: center;
    }
    .logo {
      color: #eab308;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 2px;
      margin: 0;
      text-transform: uppercase;
    }
    .content {
      padding: 35px;
    }
    h1 {
      color: #ffffff;
      font-size: 18px;
      font-weight: 750;
      margin-top: 0;
      margin-bottom: 15px;
    }
    p {
      font-size: 13.5px;
      line-height: 1.6;
      margin-bottom: 25px;
      color: #a1a1aa;
    }
    .code-block {
      background-color: #030303;
      border: 1px solid #eab308;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 30px 0;
    }
    .code {
      font-size: 32px;
      font-weight: 850;
      color: #eab308;
      letter-spacing: 8px;
      font-family: monospace;
    }
    .footer {
      background-color: #040405;
      padding: 18px;
      border-top: 1px solid #18181b;
      text-align: center;
      font-size: 10px;
      color: #52525b;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo">GOLD AI TRADER</div>
      </div>
      <div class="content">
        <h1>Verify Your Notification Email</h1>
        <p>You requested to link this email address to your Gold AI Trader account. Please enter the secure 6-digit verification code below in your settings console to complete the activation:</p>
        
        <div class="code-block">
          <div class="code">${token}</div>
        </div>

        <p>This verification code is valid for 15 minutes. If you did not initiate this request, please ignore this message.</p>
      </div>
      <div class="footer">
        <p>GOLD AI PLATFORM LLC • DATA DISPATCH SECURITY SECURE_NODE</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  if (!client) {
    console.log(`[Email Sandbox - No Resend Key] sendVerificationEmail simulation to ${to} with token ${token}`);
    return true;
  }

  try {
    const result = await client.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    console.log(`📡 [Resend API] Verification email sent to ${to}. ID: ${result.data?.id || 'unknown'}`);
    return true;
  } catch (error: any) {
    console.error(`❌ [Resend API Error] Failed to send verification email to ${to}:`, error.message);
    throw error;
  }
}

/**
 * Sends a password reset email using Resend.
 */
export async function sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
  const client = getResendClient();
  const subject = 'Reset Your Gold AI Password';
  const appUrl = config.appUrl || 'http://localhost:3000';
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your Password</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #050506;
      color: #e4e4e7;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      background-color: #050506;
      padding: 40px 20px;
    }
    .container {
      max-width: 500px;
      margin: 0 auto;
      background-color: #09090b;
      border: 1px solid #18181b;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    .header {
      background-color: #12110d;
      border-bottom: 2px solid #eab308;
      padding: 25px;
      text-align: center;
    }
    .logo {
      color: #eab308;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 2px;
      margin: 0;
      text-transform: uppercase;
    }
    .content {
      padding: 35px;
      text-align: center;
    }
    h1 {
      color: #ffffff;
      font-size: 18px;
      font-weight: 750;
      margin-top: 0;
      margin-bottom: 15px;
    }
    p {
      font-size: 13.5px;
      line-height: 1.6;
      margin-bottom: 25px;
      color: #a1a1aa;
      text-align: left;
    }
    .btn-wrap {
      text-align: center;
      margin: 30px 0;
    }
    .action-btn {
      background-color: #eab308;
      color: #000000;
      text-decoration: none;
      font-size: 13.5px;
      font-weight: 700;
      padding: 12px 28px;
      border-radius: 10px;
      display: inline-block;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 12px rgba(234, 179, 8, 0.2);
    }
    .footer {
      background-color: #040405;
      padding: 18px;
      border-top: 1px solid #18181b;
      text-align: center;
      font-size: 10px;
      color: #52525b;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo">GOLD AI TRADER</div>
      </div>
      <div class="content">
        <h1>Reset Your Password</h1>
        <p>We received a request to reset your Gold AI Trader password. Click the button below to authorize a new password for your account:</p>
        
        <div class="btn-wrap">
          <a href="${resetUrl}" class="action-btn" target="_blank">Reset Password</a>
        </div>

        <p>If you did not make this request, you can safely ignore this email. The password will remain unchanged.</p>
      </div>
      <div class="footer">
        <p>GOLD AI PLATFORM LLC • SECURITY DESPATCH SECURE_NODE</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  if (!client) {
    console.log(`[Email Sandbox - No Resend Key] sendPasswordResetEmail simulation to ${to} with token ${token}`);
    return true;
  }

  try {
    const result = await client.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    console.log(`📡 [Resend API] Password reset email sent to ${to}. ID: ${result.data?.id || 'unknown'}`);
    return true;
  } catch (error: any) {
    console.error(`❌ [Resend API Error] Failed to send password reset email to ${to}:`, error.message);
    throw error;
  }
}

/**
 * General purpose Resend dispatcher for other alerts/reports.
 */
export async function sendGeneralEmail(to: string, subject: string, html: string): Promise<boolean> {
  const client = getResendClient();

  if (!client) {
    console.log(`[Email Sandbox - No Resend Key] sendGeneralEmail simulation to ${to} for subject "${subject}"`);
    return true;
  }

  try {
    const result = await client.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    console.log(`📡 [Resend API] General email dispatched to ${to}. ID: ${result.data?.id || 'unknown'}`);
    return true;
  } catch (error: any) {
    console.error(`❌ [Resend API Error] Failed to send general email to ${to}:`, error.message);
    throw error;
  }
}
