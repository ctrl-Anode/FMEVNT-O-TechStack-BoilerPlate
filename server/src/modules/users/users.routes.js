import { Router } from 'express';
import * as controller from './users.controller.js';
import * as v from './users.validation.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';

const router = Router();

router.use(authenticate);

/* @openapi
  /users/me:
    get:
      tags: [Users]
      summary: Own profile with permissions
      security: [{ bearerAuth: [] }]
      responses:
        200: { description: Profile }
*/
router.get('/me', controller.getProfile);

/* @openapi
  /users/me:
    patch:
      tags: [Users]
      summary: Update own basic profile fields
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                firstName: { type: string }
                lastName: { type: string }
      responses:
        200: { description: Updated profile }
*/
router.patch('/me', validate({ body: v.updateProfileSchema }), controller.updateProfile);

/* @openapi
  /users:
    get:
      tags: [Users]
      summary: List users (paginated, searchable)
      description: Requires permission "users:read"
      security: [{ bearerAuth: [] }]
      parameters:
        - { in: query, name: page, schema: { type: integer } }
        - { in: query, name: limit, schema: { type: integer } }
        - { in: query, name: q, schema: { type: string } }
        - { in: query, name: status, schema: { type: string, enum: [ACTIVE, INACTIVE, SUSPENDED] } }
        - { in: query, name: roleId, schema: { type: string, format: uuid } }
        - { in: query, name: sort, schema: { type: string, enum: [createdAt, -createdAt, firstName, -firstName, email, -email] } }
      responses:
        200:
          description: Paginated users
          content:
            application/json:
              schema: { $ref: '#/components/schemas/PaginatedUsers' }
        403: { $ref: '#/components/responses/Forbidden' }
*/
router.get('/', authorize('users:read'), validate({ query: v.listUsersQuerySchema }), controller.list);

/* @openapi
  /users/{id}:
    get:
      tags: [Users]
      summary: Get a single user
      security: [{ bearerAuth: [] }]
      parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
      responses:
        200: { description: User }
        404: { $ref: '#/components/responses/NotFound' }
*/
router.get('/:id', authorize('users:read'), validate({ params: v.getUserParamsSchema }), controller.getById);

/* @openapi
  /users:
    post:
      tags: [Users]
      summary: Create a user
      description: Requires permission "users:create"
      security: [{ bearerAuth: [] }]
      responses:
        201: { description: Created user }
        409: { $ref: '#/components/responses/Conflict' }
*/
router.post('/', authorize('users:create'), validate({ body: v.createUserSchema }), controller.create);

/* @openapi
  /users/{id}:
    patch:
      tags: [Users]
      summary: Update a user (fields and role assignment)
      description: Requires permission "users:update"
      security: [{ bearerAuth: [] }]
      parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
      responses:
        200: { description: Updated user }
*/
router.patch('/:id', authorize('users:update'), validate({ params: v.getUserParamsSchema, body: v.updateUserSchema }), controller.update);

/* @openapi
  /users/{id}:
    delete:
      tags: [Users]
      summary: Soft-delete a user
      description: Requires permission "users:delete"
      security: [{ bearerAuth: [] }]
      parameters: [{ in: path, name: id, required: true, schema: { type: string, format: uuid } }]
      responses:
        200: { description: Deleted }
*/
router.delete('/:id', authorize('users:delete'), validate({ params: v.getUserParamsSchema }), controller.remove);

export default router;
