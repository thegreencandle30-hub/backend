import { Router } from 'express';
import subscriptionController from '../controllers/subscription-controller.js';
import { verifyToken } from '../middlewares/auth-middleware.js';
import { validate } from '../middlewares/validate-middleware.js';
import { initiatePaymentSchema } from '../validators/subscription-validator.js';
import { paymentLimiter } from '../middlewares/security-middleware.js';

const router = Router();

// Public routes
router.get('/plans', subscriptionController.getPlans);

// PhonePe callback (no auth required - called by PhonePe)
router.post('/callback', subscriptionController.paymentCallback);

// Protected routes
router.use(verifyToken);

// Apply payment rate limiter to payment-related endpoints
router.post(
  '/initiate',
  paymentLimiter,
  validate(initiatePaymentSchema),
  subscriptionController.initiatePayment
);

router.get('/status/:transactionId', subscriptionController.checkStatus);

export default router;
