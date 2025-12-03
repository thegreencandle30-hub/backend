import { Router } from 'express';
import authRoutes from './auth-routes.js';
import userRoutes from './user-routes.js';
import adminRoutes from './admin-routes.js';
import callRoutes from './call-routes.js';
import subscriptionRoutes from './subscription-routes.js';
import marketRoutes from './market-routes.js';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/calls', callRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/market', marketRoutes);

export default router;
