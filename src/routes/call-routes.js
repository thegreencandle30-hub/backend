import { Router } from 'express';
import callController from '../controllers/call-controller.js';
import { verifyToken, requireActiveSubscription } from '../middlewares/auth-middleware.js';
import { validate } from '../middlewares/validate-middleware.js';
import { paginationSchema } from '../validators/auth-validator.js';

const router = Router();

// All routes require authentication
router.use(verifyToken);

// All routes require active subscription
router.use(requireActiveSubscription);

// Get today's calls
router.get('/', callController.getTodayCalls);

// Get call history
router.get(
  '/history',
  validate(paginationSchema, 'query'),
  callController.getCallHistory
);

// Get call performance stats
router.get('/history/stats', callController.getCallStats);

// Get stats by commodity
router.get('/history/stats/by-commodity', callController.getStatsByCommodity);

// Get single call
router.get('/:id', callController.getCallById);

export default router;
