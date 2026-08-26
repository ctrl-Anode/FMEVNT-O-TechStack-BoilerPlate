import { prisma } from '../lib/prisma.js';
import { logger } from '../config/logger.js';
import { getMessaging_ } from '../lib/firebase.js';
import { ApiError } from '../utils/ApiError.js';

const TOKEN_UNREGISTERED = 'messaging/registration-token-not-registered';

export async function registerDevice(userId, fcmToken, platform = 'web') {
  const device = await prisma.device.upsert({
    where: { fcmToken },
    update: { userId, platform, lastSeenAt: new Date() },
    create: { userId, fcmToken, platform }
  });
  return device;
}

export async function sendPushToUser(userId, { title, body, data = {} }) {
  const devices = await prisma.device.findMany({ where: { userId }, select: { id: true, fcmToken: true } });
  if (devices.length === 0) return { sent: 0, failed: 0 };

  const messaging = getMessaging_();
  if (!messaging) throw ApiError.serviceUnavailable('FCM is not configured on the server');

  const tokens = devices.map((device) => device.fcmToken);
  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value)]))
  });

  const invalidTokens = [];
  response.responses.forEach((result, index) => {
    if (!result.success && result.error?.code === TOKEN_UNREGISTERED) {
      invalidTokens.push(devices[index].id);
    }
  });
  if (invalidTokens.length > 0) {
    await prisma.device.deleteMany({ where: { id: { in: invalidTokens } } });
  }

  await prisma.notification.create({
    data: { userId, channel: 'PUSH', title, body, data }
  });

  logger.info({ userId, sent: response.successCount, failed: response.failureCount }, 'push_sent');
  return { sent: response.successCount, failed: response.failureCount };
}
