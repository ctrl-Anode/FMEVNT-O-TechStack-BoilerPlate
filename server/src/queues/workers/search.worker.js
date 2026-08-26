import { indexUser, removeUser } from '../../services/search.js';

export const name = 'search';
export const concurrency = 5;

export async function processor(job) {
  if (job.name === 'remove') {
    await removeUser(job.data.user.id);
    return;
  }
  await indexUser(job.data.user);
}
