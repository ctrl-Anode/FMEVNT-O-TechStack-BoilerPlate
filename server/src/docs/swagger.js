import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { PERMISSIONS } from '../config/constants.js';

const spec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Enterprise Boilerplate API',
      version: '1.0.0',
      description:
        'Production-ready Express API: JWT auth with refresh rotation & TOTP MFA, RBAC permissions, file uploads with image pipeline, BullMQ queues, Meilisearch, FCM push.',
      license: { name: 'MIT' }
    },
    servers: [{ url: '/api/v1', description: 'Current host' }],
    tags: [
      { name: 'Auth' },
      { name: 'Users' },
      { name: 'Roles' },
      { name: 'Uploads' },
      { name: 'Notifications' },
      { name: 'Search' },
      { name: 'Stats' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            code: { type: 'string' },
            message: { type: 'string' },
            requestId: { type: 'string' }
          }
        },
        PaginatedUsers: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: { $ref: '#/components/schemas/User' } },
            meta: { $ref: '#/components/schemas/PaginationMeta' }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
            roles: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' } } } }
          }
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' }
          }
        }
      },
      responses: {
        ValidationError: {
          description: 'Validation failed',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
        },
        Unauthorized: {
          description: 'Missing or invalid token',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
        },
        Forbidden: {
          description: 'Insufficient permissions',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
        },
        NotFound: {
          description: 'Resource not found',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
        },
        Conflict: {
          description: 'Conflict',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./src/modules/**/*.routes.js']
});

spec['x-permission-catalog'] = PERMISSIONS;

export function mountSwagger(app) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: 'API Docs' }));
  app.get('/api/docs.json', (_req, res) => res.json(spec));
}
