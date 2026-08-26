import { sendEmail } from '../../services/mail/index.js';

export const name = 'email';
export const concurrency = 5;

export async function processor(job) {
  const { template, to, data } = job.data;
  await sendEmail({ template, to, data });
}
