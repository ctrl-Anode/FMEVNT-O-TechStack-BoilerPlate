import { z } from 'zod';
import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

router.use(authenticate);

const querySchema = z.object({ days: z.coerce.number().int().min(7).max(90).default(14) });

/* @openapi
  /stats/overview:
    get:
      tags: [Stats]
      summary: Platform totals + signup series for the dashboard
      description: Requires permission "stats:read"
      security: [{ bearerAuth: [] }]
      responses:
        200: { description: Totals and daily signup counts }
        403: { $ref: '#/components/responses/Forbidden' }
*/
router.get(
  '/overview',
  authorize('stats:read'),
  validate({ query: querySchema }),
  asyncHandler(async (req, res) => {
    const days = req.query.days;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [users, files, devices, activeSessions, notifications, series] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.file.count(),
      prisma.device.count(),
      prisma.session.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
      prisma.notification.count(),
      prisma.$queryRaw`
        SELECT DATE(createdAt) AS day, COUNT(*) AS count
        FROM users
        WHERE createdAt >= ${since} AND deletedAt IS NULL
        GROUP BY DATE(createdAt)
        ORDER BY day ASC
      `
    ]);

    res.json({
      success: true,
      data: {
        totals: { users, files, devices, activeSessions, notifications },
        series: series.map((row) => ({
          day: row.day instanceof Date ? row.day.toISOString().slice(0, 10) : String(row.day),
          count: Number(row.count)
        }))
      }
    });
  })
);

export default router;
