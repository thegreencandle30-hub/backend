import { Router } from 'express';
import authController from '../controllers/auth-controller.js';
import adminAuthController from '../controllers/admin-auth-controller.js';
import { validate } from '../middlewares/validate-middleware.js';
import { loginSchema, refreshTokenSchema, adminLoginSchema } from '../validators/auth-validator.js';
import { authLimiter } from '../middlewares/security-middleware.js';
import { verifyToken } from '../middlewares/auth-middleware.js';

const router = Router();

// Apply auth rate limiter to all auth routes
router.use(authLimiter);

// Public routes for user authentication
router.post(
  '/login',
  validate(loginSchema),
  authController.login
);

router.post(
  '/change-password',
  verifyToken,
  authController.changePassword
);

router.post(
  '/refresh',
  validate(refreshTokenSchema),
  authController.refreshAccessToken
);

// Logout - revoke refresh tokens
router.post(
  '/logout',
  validate(refreshTokenSchema),
  authController.logout
);

// Admin authentication routes
router.post(
  '/admin/login',
  validate(adminLoginSchema),
  adminAuthController.adminLogin
);

router.post(
  '/admin/refresh',
  validate(refreshTokenSchema),
  adminAuthController.adminRefreshToken
);

// Admin logout
router.post(
  '/admin/logout',
  validate(refreshTokenSchema),
  adminAuthController.adminLogout
);

export default router;
