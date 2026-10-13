const nodemailer = require('nodemailer');

function createTransporter() {
  require('dotenv').config();
  const user = (process.env.GMAIL_USER || 'omchoramle210@gmail.com').trim();
  const rawPass = process.env.GMAIL_APP_PASSWORD || '';
  const pass = rawPass.replace(/\s+/g, '').trim();

  if (!pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass
    }
  });
}

async function sendOtpEmail(toEmail, otpCode) {
  const transporter = createTransporter();
  const senderUser = process.env.GMAIL_USER || 'omchoramle210@gmail.com';

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #0b1120; border: 1px solid #1e293b; border-radius: 12px; padding: 32px; color: #f8fafc;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #06b6d4; font-size: 26px; margin: 0; font-weight: 800; letter-spacing: 1px;">BioVault<span style="color: #38bdf8;">-AI</span></h1>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Multi-Modal Biometric Security Platform</p>
      </div>

      <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 10px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="font-size: 15px; color: #cbd5e1; margin-top: 0;">Your One-Time Passwordless Verification Code:</p>
        <div style="display: inline-block; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #10b981; background: #030712; padding: 12px 28px; border-radius: 8px; border: 1px solid #10b981; font-family: 'Courier New', Courier, monospace;">
          ${otpCode}
        </div>
        <p style="font-size: 13px; color: #94a3b8; margin-bottom: 0; margin-top: 16px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
      </div>

      <div style="border-top: 1px solid #1e293b; padding-top: 16px; font-size: 12px; color: #64748b; line-height: 1.5;">
        <p>🔒 <strong>Security Policy:</strong> This verification is part of the BioVault Multi-Modal Zero-Trust login process (Email OTP + FIDO2 Passkey + Biometric Face Verification).</p>
      </div>
    </div>
  `;

  if (!transporter) {
    console.warn(`[BioVault Email Service] ⚠️ GMAIL_APP_PASSWORD is not set in backend/.env. Simulated OTP for ${toEmail}: ${otpCode}`);
    return {
      sent: false,
      simulated: true,
      code: otpCode,
      message: 'GMAIL_APP_PASSWORD not configured. Simulated OTP provided.'
    };
  }

  try {
    const info = await transporter.sendMail({
      from: `"BioVault-AI Security" <${senderUser}>`,
      to: toEmail,
      subject: `🔐 Your BioVault-AI Verification Code: ${otpCode}`,
      html: htmlContent
    });

    console.log(`[BioVault Email Service] ✅ Real email successfully sent to ${toEmail}. Message ID: ${info.messageId}`);
    return {
      sent: true,
      simulated: false,
      messageId: info.messageId,
      code: otpCode
    };
  } catch (err) {
    console.error(`[BioVault Email Service] ❌ Error sending email via Gmail SMTP:`, err.message);
    return {
      sent: false,
      error: err.message,
      simulated: true,
      code: otpCode
    };
  }
}

async function sendUnauthorizedAccessAlert(toEmail, details = {}) {
  const transporter = createTransporter();
  const senderUser = process.env.GMAIL_USER || 'omchoramle210@gmail.com';
  const {
    distance = '0.42',
    threshold = '0.30',
    action = 'High-Value Financial Transfer / Settings Modification',
    time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  } = details;

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 620px; margin: 0 auto; background: #080d1a; border: 2px solid #ef4444; border-radius: 14px; padding: 32px; color: #f8fafc;">
      
      <!-- Alert Header -->
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; padding: 8px 18px; border-radius: 20px; margin-bottom: 12px;">
          <span style="color: #ef4444; font-weight: 800; font-size: 13px; letter-spacing: 1.5px;">⚠️ CRITICAL SECURITY INCIDENT ALERT</span>
        </div>
        <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 800;">Unauthorized Biometric Access Attempt</h1>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 6px;">BioVault-AI Multi-Modal Zero-Trust Defense Network</p>
      </div>

      <!-- Incident Breakdown -->
      <div style="background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 10px; padding: 20px; margin-bottom: 24px;">
        <h3 style="color: #fca5a5; font-size: 15px; margin-top: 0; margin-bottom: 12px; border-bottom: 1px solid rgba(239,68,68,0.2); padding-bottom: 8px;">
          🛡️ Incident Forensic Details
        </h3>
        
        <table style="width: 100%; font-size: 13px; color: #cbd5e1; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
            <td style="padding: 8px 0; color: #94a3b8;">Target Account:</td>
            <td style="padding: 8px 0; font-weight: 700; color: #38bdf8;">${toEmail}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
            <td style="padding: 8px 0; color: #94a3b8;">Timestamp:</td>
            <td style="padding: 8px 0; font-weight: 600; color: #f8fafc;">${time} IST</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
            <td style="padding: 8px 0; color: #94a3b8;">Trigger Event:</td>
            <td style="padding: 8px 0; font-weight: 600; color: #fbbf24;">${action}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
            <td style="padding: 8px 0; color: #94a3b8;">Biometric Result:</td>
            <td style="padding: 8px 0; font-weight: 700; color: #ef4444;">❌ MISMATCH (Distance D=${distance} ≥ ${threshold})</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8;">Threat Status:</td>
            <td style="padding: 8px 0; font-weight: 700; color: #ef4444;">Non-Account Holder Face Detected</td>
          </tr>
        </table>
      </div>

      <!-- Security Notice -->
      <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 10px; padding: 18px; margin-bottom: 20px; font-size: 13px; color: #cbd5e1; line-height: 1.6;">
        <p style="margin: 0 0 8px 0; color: #fca5a5; font-weight: 700;">
          🔒 Automated Threat Protection
        </p>
        <p style="margin: 0;">
          All financial transfers and settings changes remain protected under BioVault-AI's Zero-Trust biometric architecture. If 3 consecutive failed attempts occur, the system automatically engages an immediate 5-hour lockdown on-screen. No manual intervention is needed.
        </p>
      </div>

      <!-- Footer Policy & Contacts -->
      <div style="border-top: 1px solid #1e293b; padding-top: 16px; font-size: 12px; color: #64748b; line-height: 1.6;">
        <p style="margin: 0 0 6px 0;">For emergency assistance or manual verification, contact our 24/7 Security Operations Center at <strong>+91 (022) 8000-VAULT</strong> or email <strong>security-alerts@biovault.ai</strong>.</p>
        <p style="margin: 0;"><em>BioVault-AI Multi-Modal Biometric Security &bull; High-Assurance Financial Retrieval Platform</em></p>
      </div>

    </div>
  `;

  if (!transporter) {
    console.warn(`[BioVault Security Alert] ⚠️ SMTP missing. Simulated Unauthorized Access Alert to ${toEmail}`);
    return {
      sent: false,
      simulated: true,
      message: 'GMAIL_APP_PASSWORD not configured. Simulated security alert logged.'
    };
  }

  try {
    const info = await transporter.sendMail({
      from: `"BioVault-AI Security Alert" <${senderUser}>`,
      to: toEmail,
      subject: `🚨 SECURITY ALERT: Unauthorized Biometric Face Access Attempt on BioVault-AI`,
      html: htmlContent
    });

    console.log(`[BioVault Security Alert] 🚨 Unauthorized access alert email sent to ${toEmail}. Message ID: ${info.messageId}`);
    return {
      sent: true,
      simulated: false,
      messageId: info.messageId
    };
  } catch (err) {
    console.error(`[BioVault Security Alert] ❌ Error sending alert email:`, err.message);
    return {
      sent: false,
      error: err.message,
      simulated: true
    };
  }
}

module.exports = {
  sendOtpEmail,
  sendUnauthorizedAccessAlert
};
