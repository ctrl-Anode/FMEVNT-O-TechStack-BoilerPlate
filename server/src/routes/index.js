import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/users/users.routes.js';
import roleRoutes from '../modules/roles/roles.routes.js';
import uploadRoutes from '../modules/uploads/uploads.routes.js';
import notificationRoutes from '../modules/notifications/notifications.routes.js';
import searchRoutes from '../modules/search/search.routes.js';
import statsRoutes from '../modules/stats/stats.routes.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    name: 'Enterprise Boilerplate API',
    version: '1.0.0',
    docs: '/api/docs',
    health: '/healthz'
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/uploads', uploadRoutes);
router.use('/notifications', notificationRoutes);
router.use('/search', searchRoutes);
router.use('/stats', statsRoutes);

export default router;
