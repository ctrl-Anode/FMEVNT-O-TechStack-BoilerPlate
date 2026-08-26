import { Router } from 'express';
import * as service from './roles.service.js';
import * as v from './roles.validation.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

const create = asyncHandler(async (req, res) => {
  const role = await service.createRole(req.body, req.user.id, req.ip);
  res.status(201).json({ success: true, data: role });
});

const update = asyncHandler(async (req, res) => {
  const role = await service.updateRole(req.params.id, req.body, req.user.id, req.ip);
  res.json({ success: true, data: role });
});

const remove = asyncHandler(async (req, res) => {
  const result = await service.deleteRole(req.params.id, req.user.id, req.ip);
  res.json({ success: true, data: result });
});

/* @openapi
  /roles:
    get:
      tags: [Roles]
      summary: List roles with their permissions
      description: Requires permission "roles:read"
      security: [{ bearerAuth: [] }]
      responses:
        200: { description: Roles with permissions and user counts }
*/
router.get('/', authorize('roles:read'), asyncHandler(async (_req, res) => {
  const roles = await service.listRoles();
  res.json({ success: true, data: roles });
}));

/* @openapi
  /roles/permissions:
    get:
      tags: [Roles]
      summary: Permission catalog
      security: [{ bearerAuth: [] }]
      responses:
        200: { description: All permission keys }
*/
router.get('/permissions', authorize('roles:read'), asyncHandler(async (_req, res) => {
  const permissions = await service.listPermissions();
  res.json({ success: true, data: permissions });
}));

/* @openapi
  /roles:
    post:
      tags: [Roles]
      summary: Create a role
      security: [{ bearerAuth: [] }]
      responses:
        201: { description: Created }
        409: { $ref: '#/components/responses/Conflict' }
*/
router.post('/', authorize('roles:manage'), validate({ body: v.createRoleSchema }), create);

/* @openapi
  /roles/{id}:
    patch:
      tags: [Roles]
      summary: Update role description/permissions (system roles locked)
      security: [{ bearerAuth: [] }]
      parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
      responses:
        200: { description: Updated }
        403: { $ref: '#/components/responses/Forbidden' }
*/
router.patch('/:id', authorize('roles:manage'), validate({ params: v.roleParamsSchema, body: v.updateRoleSchema }), update);

/* @openapi
  /roles/{id}:
    delete:
      tags: [Roles]
      summary: Delete a non-system role
      security: [{ bearerAuth: [] }]
      parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
      responses:
        200: { description: Deleted }
*/
router.delete('/:id', authorize('roles:manage'), validate({ params: v.roleParamsSchema }), remove);

export default router;
