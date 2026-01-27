import { Router } from 'express';
import subscriptionController from '../controllers/subscription-controller.js';
import planController from '../controllers/plan-controller.js';
import { verifyToken } from '../middlewares/auth-middleware.js';
import { validate } from '../middlewares/validate-middleware.js';
import { initiatePaymentSchema, registerSchema, paymentCallbackSchema } from '../validators/subscription-validator.js';
import { paymentLimiter } from '../middlewares/security-middleware.js';

const router = Router();

// Public routes
router.get('/plans', planController.getActivePlans);

router.post(
  '/register',
  paymentLimiter,
  validate(registerSchema),
  subscriptionController.registerAndSubscribe
);

// PhonePe callback (no auth required - called by PhonePe)
router.post(
  '/callback',
  validate(paymentCallbackSchema),
  subscriptionController.paymentCallback
);

// PhonePe redirect bridge (Handles POST from PhonePe and redirects to User App)
router.post('/redirect-handler', subscriptionController.handlePaymentRedirect);

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
