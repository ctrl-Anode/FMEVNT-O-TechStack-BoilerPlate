import { z } from 'zod';
import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { registerDevice } from '../../services/push.js';
import { queuePush } from '../../queues/jobs.js';

const router = Router();

router.use(authenticate);

const deviceSchema = z.object({
  fcmToken: z.string().min(20).max(4096),
  platform: z.enum(['web', 'ios', 'android']).default('web')
});

const sendSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1).max(255),
  body: z.string().min(1).max(2000),
  data: z.record(z.string()).optional()
});

/* @openapi
  /notifications/devices:
    post:
      tags: [Notifications]
      summary: Register/refresh an FCM device token for the current user
      security: [{ bearerAuth: [] }]
      responses:
        201: { description: Device registered }
*/
router.post(
  '/devices',
  validate({ body: deviceSchema }),
  asyncHandler(async (req, res) => {
    const device = await registerDevice(req.user.id, req.body.fcmToken, req.body.platform);
    res.status(201).json({ success: true, data: { id: device.id } });
  })
);

/* @openapi
  /notifications/me:
    get:
      tags: [Notifications]
      summary: Own notification feed (paginated)
      security: [{ bearerAuth: [] }]
      parameters:
        - { in: query, name: page, schema: { type: integer } }
        - { in: query, name: limit, schema: { type: integer } }
      responses:
        200: { description: Notifications }
*/
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));

    const where = { userId: req.user.id };
    const [rows, total, unread] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, readAt: null } })
    ]);

    res.json({ success: true, data: rows, meta: { page, limit, total, unread } });
  })
);

/* @openapi
  /notifications/{id}/read:
    patch:
      tags: [Notifications]
      summary: Mark a notification as read
      security: [{ bearerAuth: [] }]
      parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
      responses:
        200: { description: Marked read }
*/
router.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const parsed = z.object({ id: z.string().uuid() }).safeParse(req.params);
    if (!parsed.success) throw ApiError.badRequest('Invalid id');

    const updated = await prisma.notification.updateMany({
      where: { id: parsed.data.id, userId: req.user.id, readAt: null },
      data: { readAt: new Date() }
    });
    if (updated.count === 0) throw ApiError.notFound('Notification not found');
    res.json({ success: true, data: { read: true } });
  })
);

/* @openapi
  /notifications/send:
    post:
      tags: [Notifications]
      summary: Queue an FCM push to a user
      description: Requires permission "notifications:send". Silently succeeds if FCM is disabled.
      security: [{ bearerAuth: [] }]
      responses:
        202: { description: Push queued }
        503: { description: FCM not configured }
*/
router.post(
  '/send',
  authorize('notifications:send'),
  validate({ body: sendSchema }),
  asyncHandler(async (req, res) => {
    queuePush(req.body.userId, {
      title: req.body.title,
      body: req.body.body,
      data: req.body.data || {}
    });
    res.status(202).json({ success: true, data: { queued: true } });
  })
);

export default router;
