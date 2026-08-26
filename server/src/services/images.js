import sharp from 'sharp';
import { prisma } from '../lib/prisma.js';
import { logger } from '../config/logger.js';
import { UPLOADS } from '../config/constants.js';
import { getObject, putObject, deleteObject, objectUrl } from './storage/index.js';

async function replaceObject(key, buffer, contentType) {
  await deleteObject(key).catch(() => undefined);
  await putObject(key, buffer, contentType);
}

export async function processImage(fileId) {
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file || file.status === 'READY') return;

  await prisma.file.update({ where: { id: fileId }, data: { status: 'PROCESSING', error: null } });

  try {
    const originalBuffer = await getObject(file.key);
    const pipeline = sharp(originalBuffer, { failOn: 'error' }).rotate();
    const metadata = await pipeline.metadata();

    const variants = [];
    for (const variant of UPLOADS.IMAGE_VARIANTS) {
      const targetWidth = Math.min(variant.width, metadata.width || variant.width);
      if (targetWidth < 32) continue;

      const { data, info } = await pipeline
        .clone()
        .resize({ width: targetWidth, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true });

      const key = file.key.replace(/(\.[^./]+)?$/, `__${variant.name}.webp`);
      await replaceObject(key, data, 'image/webp');

      variants.push({
        name: variant.name,
        key,
        width: info.width,
        height: info.height,
        bytes: info.size,
        url: objectUrl(key)
      });
    }

    await prisma.file.update({
      where: { id: fileId },
      data: {
        status: 'READY',
        width: metadata.width || null,
        height: metadata.height || null,
        variants
      }
    });

    logger.info({ fileId, variants: variants.length }, 'image_processed');
  } catch (error) {
    await prisma.file
      .update({ where: { id: fileId }, data: { status: 'FAILED', error: error.message } })
      .catch(() => undefined);
    throw error;
  }
}
