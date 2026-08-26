import { z } from 'zod';
import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { searchUsers } from '../../services/search.js';

const router = Router();

router.use(authenticate);

const querySchema = z.object({
  q: z.string().trim().max(100).default(''),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional()
});

/* @openapi
  /search/users:
    get:
      tags: [Search]
      summary: Full-text user search powered by Meilisearch (SQL fallback)
      security: [{ bearerAuth: [] }]
      parameters:
        - { in: query, name: q, schema: { type: string } }
        - { in: query, name: page, schema: { type: integer } }
        - { in: query, name: limit, schema: { type: integer } }
      responses:
        200: { description: Matching users with total }
*/
router.get(
  '/users',
  validate({ query: querySchema }),
  asyncHandler(async (req, res) => {
    const { rows, total } = await searchUsers({
      q: req.query.q,
      page: req.query.page || 1,
      limit: req.query.limit || 20
    });
    res.json({ success: true, data: rows, meta: { total } });
  })
);

export default router;
