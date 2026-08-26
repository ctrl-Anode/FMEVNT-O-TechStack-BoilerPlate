import { sendPushToUser } from '../../services/push.js';

export const name = 'push';
export const concurrency = 10;

export async function processor(job) {
  const { userId, title, body, data } = job.data;
  await sendPushToUser(userId, { title, body, data });
}
