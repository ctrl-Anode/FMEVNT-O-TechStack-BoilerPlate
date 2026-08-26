import { Resend } from 'resend';
import { config } from '../../../config/env.js';

let client = null;

function getClient() {
  if (!client) {
    if (!config.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    client = new Resend(config.RESEND_API_KEY);
  }
  return client;
}

export async function send(payload) {
  const result = await getClient().emails.send({
    from: payload.from,
    to: [payload.to],
    subject: payload.subject,
    text: payload.text,
    html: payload.html
  });
  if (result.error) throw new Error(result.error.message);
  return { id: result.data.id };
}
