import { Router } from 'express';
import userController from '../controllers/user-controller.js';
import { verifyToken } from '../middlewares/auth-middleware.js';
import { validate } from '../middlewares/validate-middleware.js';
import { updateFcmTokenSchema } from '../validators/auth-validator.js';

const router = Router();

// All routes require authentication
router.use(verifyToken);

// Get current user profile
router.get('/me', userController.getCurrentUser);

// Export transactions
router.get('/me/transactions/export', userController.exportTransactions);

// Update FCM token
router.put(
  '/me/fcm-token',
  validate(updateFcmTokenSchema),
  userController.updateFcmToken
);

export default router;
