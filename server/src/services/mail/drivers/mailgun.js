import Mailgun from 'mailgun.js';
import FormData from 'form-data';
import { config } from '../../../config/env.js';

let client = null;

function getClient() {
  if (!client) {
    if (!config.MAILGUN_API_KEY || !config.MAILGUN_DOMAIN) {
      throw new Error('MAILGUN_API_KEY and MAILGUN_DOMAIN are not configured');
    }
    const options = { username: 'api', key: config.MAILGUN_API_KEY };
    if ((config.MAILGUN_BASE_URL || '').includes('eu')) {
      options.url = 'https://api.eu.mailgun.net';
    }
    client = new Mailgun(FormData).client(options);
  }
  return client;
}

export async function send(payload) {
  const result = await getClient().messages.create(config.MAILGUN_DOMAIN, {
    from: payload.from,
    to: [payload.to],
    subject: payload.subject,
    text: payload.text,
    html: payload.html
  });
  return { id: result.id };
}
