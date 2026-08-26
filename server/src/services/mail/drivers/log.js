import { logger } from '../../../config/logger.js';

export async function send(payload) {
  logger.info(
    {
      to: payload.to,
      subject: payload.subject,
      from: payload.from,
      preview: (payload.text || '').slice(0, 120)
    },
    'email(log-driver)'
  );
  return { id: `log-${Date.now()}` };
}
