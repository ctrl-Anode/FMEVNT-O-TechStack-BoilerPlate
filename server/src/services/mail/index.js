import { config } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { renderTemplate, templates } from './templates.js';
import * as logDriver from './drivers/log.js';
import * as smtpDriver from './drivers/smtp.js';
import * as resendDriver from './drivers/resend.js';
import * as sendgridDriver from './drivers/sendgrid.js';
import * as mailgunDriver from './drivers/mailgun.js';
import * as sesDriver from './drivers/ses.js';

const drivers = {
  log: logDriver,
  smtp: smtpDriver,
  resend: resendDriver,
  sendgrid: sendgridDriver,
  mailgun: mailgunDriver,
  ses: sesDriver
};

export function getMailDriver(name = config.MAIL_DRIVER) {
  const driver = drivers[name];
  if (!driver) throw new Error(`Unknown MAIL_DRIVER "${name}". Available: ${Object.keys(drivers).join(', ')}`);
  return driver;
}

export async function sendEmail({ template, to, data = {} }) {
  const rendered = renderTemplate(template, data);
  const driver = getMailDriver();
  const payload = {
    from: config.MAIL_FROM,
    to,
    ...rendered
  };

  try {
    const result = await driver.send(payload);
    logger.info({ template, to, driver: config.MAIL_DRIVER }, 'email_sent');
    return result;
  } catch (error) {
    logger.error({ err: error.message, template, to, driver: config.MAIL_DRIVER }, 'email_failed');
    throw error;
  }
}

export { templates };
