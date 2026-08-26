import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { config } from '../../../config/env.js';

let client = null;

function getClient() {
  if (!client) {
    client = new SESv2Client({
      region: config.AWS_REGION || 'us-east-1',
      credentials:
        config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: config.AWS_ACCESS_KEY_ID,
              secretAccessKey: config.AWS_SECRET_ACCESS_KEY
            }
          : undefined
    });
  }
  return client;
}

export async function send(payload) {
  const command = new SendEmailCommand({
    FromEmailAddress: payload.from,
    Destination: { ToAddresses: [payload.to] },
    Content: {
      Simple: {
        Subject: { Data: payload.subject },
        Body: {
          Text: { Data: payload.text },
          Html: { Data: payload.html }
        }
      }
    }
  });
  const result = await getClient().send(command);
  return { id: result.MessageId };
}
