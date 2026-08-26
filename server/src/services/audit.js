import { prisma } from '../lib/prisma.js';
import { logger } from '../config/logger.js';

export function logAudit({ userId, action, entity, entityId, meta, ip }) {
  prisma.auditLog
    .create({
      data: {
        userId: userId || null,
        action,
        entity: entity || null,
        entityId: entityId || null,
        meta: meta || undefined,
        ip: ip || null
      }
    })
    .catch((error) => logger.warn({ err: error.message, action }, 'audit_write_failed'));
}
