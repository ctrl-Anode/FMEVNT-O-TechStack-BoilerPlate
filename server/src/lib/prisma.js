import { PrismaClient } from '@prisma/client';
import { config } from '../config/env.js';

export const prisma = new PrismaClient({
  log: config.isDev ? ['warn', 'error'] : ['error'],
  errorFormat: 'minimal'
});
