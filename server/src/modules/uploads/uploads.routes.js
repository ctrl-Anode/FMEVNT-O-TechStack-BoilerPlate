import multer from 'multer';
import { z } from 'zod';
import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { authenticate } from '../../middleware/authenticate.js';
import { UPLOADS } from '../../config/constants.js';
import { buildFileKey, putObject, deleteObject, objectUrl } from '../../services/storage/index.js';
import { queueImageProcess } from '../../queues/jobs.js';
import { logAudit } from '../../services/audit.js';

const router = Router();

router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOADS.MAX_FILE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!UPLOADS.IMAGE_MIMES.includes(file.mimetype)) {
      return cb(ApiError.badRequest(`Allowed image types: ${UPLOADS.IMAGE_MIMES.join(', ')}`));
    }
    cb(null, true);
  }
});

function requireFile(req) {
  if (!req.file) throw ApiError.badRequest('File is required (field name: "file")');
  return req.file;
}

const idParams = z.object({ id: z.string().uuid() });

/* @openapi
  /uploads/avatar:
    post:
      tags: [Uploads]
      summary: Upload an avatar image (multipart/form-data, field "file")
      description: Creates the File record, stores the original and queues Sharp variant generation (webp thumb/md/lg).
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file: { type: string, format: binary }
      responses:
        201: { description: File stored and processing queued }
*/
router.post(
  '/avatar',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const file = requireFile(req);
    if (file.size > UPLOADS.MAX_IMAGE_BYTES) {
      throw ApiError.badRequest('Avatar must be smaller than 5MB');
    }

    const key = buildFileKey('avatars', file.originalname);
    await putObject(key, file.buffer, file.mimetype);

    const created = await prisma.file.create({
      data: {
        uploaderId: req.user.id,
        key,
        originalName: file.originalname?.slice(0, 250),
        mimeType: file.mimetype,
        size: file.size
      }
    });

    queueImageProcess(created.id);
    logAudit({ userId: req.user.id, action: 'upload.created', entity: 'file', entityId: created.id, ip: req.ip });

    res.status(201).json({
      success: true,
      data: {
        ...created,
        url: objectUrl(created.key)
      }
    });
  })
);

/* @openapi
  /uploads/me:
    get:
      tags: [Uploads]
      summary: List own uploads
      security: [{ bearerAuth: [] }]
      responses:
        200: { description: Own files }
*/
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const rows = await prisma.file.findMany({
      where: { uploaderId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({
      success: true,
      data: rows.map((row) => ({ ...row, url: objectUrl(row.key) }))
    });
  })
);

/* @openapi
  /uploads/{id}:
    delete:
      tags: [Uploads]
      summary: Delete an upload (owner or users with uploads:delete)
      security: [{ bearerAuth: [] }]
      parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
      responses:
        200: { description: Deleted }
*/
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const parsed = idParams.safeParse(req.params);
    if (!parsed.success) throw ApiError.badRequest('Invalid file id');

    const row = await prisma.file.findUnique({ where: { id: parsed.data.id } });
    if (!row) throw ApiError.notFound('File not found');

    const isOwner = row.uploaderId === req.user.id;
    const canDeleteAny = (req.user.permissions || []).includes('*') || (req.user.permissions || []).includes('uploads:delete');
    if (!isOwner && !canDeleteAny) throw ApiError.forbidden();

    const keys = [row.key, ...((row.variants || []).map((variant) => variant.key) || [])];
    await Promise.allSettled(keys.map((key) => deleteObject(key)));
    await prisma.file.delete({ where: { id: row.id } });

    logAudit({ userId: req.user.id, action: 'upload.deleted', entity: 'file', entityId: row.id, ip: req.ip });
    res.json({ success: true, data: { deleted: true } });
  })
);

export default router;
