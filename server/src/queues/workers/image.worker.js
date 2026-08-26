import { processImage } from '../../services/images.js';

export const name = 'image';
export const concurrency = 2;

export async function processor(job) {
  await processImage(job.data.fileId);
}
