import sgMail from '@sendgrid/mail';
import { config } from '../../../config/env.js';

export async function send(payload) {
  if (!config.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY is not configured');
  }
  sgMail.setApiKey(config.SENDGRID_API_KEY);

  const [response] = await sgMail.send({
    to: payload.to,
    from: payload.from,
    subject: payload.subject,
    text: payload.text,
    html: payload.html
  });
  return { id: response.headers['x-message-id'] };
}
