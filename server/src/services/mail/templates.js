import { config } from '../../config/env.js';
import { logger } from '../../config/logger.js';

const layout = (title, bodyHtml, footerNote) => `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr><td style="background:#4f46e5;padding:20px 32px;color:#ffffff;font-size:18px;font-weight:700;">Acme Platform</td></tr>
          <tr><td style="padding:32px;color:#111827;font-size:15px;line-height:1.6;">
            <h2 style="margin:0 0 16px;font-size:20px;">${title}</h2>
            ${bodyHtml}
          </td></tr>
          <tr><td style="padding:16px 32px;background:#f9fafb;color:#6b7280;font-size:12px;">
            ${footerNote}
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

const button = (url, label) =>
  `<a href="${url}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:600;margin-top:8px;">${label}</a>`;

export function welcomeEmail({ firstName }) {
  const url = `${config.APP_URL}/login`;
  return {
    subject: 'Welcome to Acme Platform',
    html: layout(
      `Welcome, ${firstName}!`,
      `<p>Your account is ready. Sign in to explore your dashboard, manage your profile and more.</p>${button(url, 'Sign in')}`,
      'You are receiving this email because someone registered an account with this address.'
    ),
    text: `Welcome, ${firstName}! Your account is ready. Sign in at ${url}`
  };
}

export function resetPasswordEmail({ firstName, resetUrl }) {
  return {
    subject: 'Reset your password',
    html: layout(
      `Hi ${firstName},`,
      `<p>We received a request to reset your password. This link expires in 30 minutes and can be used once.</p>
       <p>If you did not request this, you can safely ignore this email.</p>${button(resetUrl, 'Reset password')}`,
      'Never share this link with anyone.'
    ),
    text: `Reset your password using this single-use link (expires in 30 minutes): ${resetUrl}`
  };
}

export function passwordChangedEmail({ firstName }) {
  return {
    subject: 'Your password was changed',
    html: layout(
      'Password updated',
      `<p>Hi ${firstName}, your password was just changed successfully. If this wasn't you, reset your password immediately and contact support.</p>`,
      'Security notification.'
    ),
    text: `Hi ${firstName}, your password was changed successfully.`
  };
}

export function renderTemplate(template, data) {
  if (!templates[template]) throw new Error(`Unknown email template: ${template}`);
  return templates[template](data);
}

export const templates = {
  welcome: welcomeEmail,
  reset_password: resetPasswordEmail,
  password_changed: passwordChangedEmail
};

if (process.env.NODE_ENV !== 'test') {
  logger.debug(`Mail templates loaded: ${Object.keys(templates).join(', ')}`);
}
