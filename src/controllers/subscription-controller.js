import User from '../models/User.js';
import Payment from '../models/Payment.js';
import phonepeService from '../services/phonepe-service.js';
import AppError from '../utils/app-error.js';
import { catchAsync } from '../utils/helpers.js';
import logger from '../utils/logger.js';
import env from '../config/env.js';

const { PLANS } = phonepeService;

/**
 * Get available subscription plans
 * GET /api/subscriptions/plans
 */
export const getPlans = catchAsync(async (req, res) => {
  const plans = Object.entries(PLANS).map(([key, value]) => ({
    id: key,
    ...value,
  }));

  res.status(200).json({
    status: 'success',
    data: { plans },
  });
});

/**
 * Initiate subscription payment
 * POST /api/subscriptions/initiate
 */
export const initiatePayment = catchAsync(async (req, res) => {
  const { plan } = req.body;
  const user = req.user;

  // Get plan details
  const planDetails = PLANS[plan];
  if (!planDetails) {
    throw new AppError('Invalid subscription plan', 400);
  }

  // Generate transaction ID
  const transactionId = phonepeService.generateTransactionId();

  // Create pending payment record
  const payment = await Payment.create({
    user: user._id,
    plan,
    amount: planDetails.amount,
    status: 'pending',
    transactionId,
  });

  // Construct callback URLs
  const callbackUrl = `${env.adminCorsOrigin.replace(':3000', ':5000')}/api/subscriptions/callback`;
  const redirectUrl = `${env.adminCorsOrigin}/payment/status?transactionId=${transactionId}`;

  // Initiate PhonePe payment
  const result = await phonepeService.initiatePayment({
    transactionId,
    amount: planDetails.amount,
    userId: user._id.toString(),
    mobile: user.mobile,
    callbackUrl,
    redirectUrl,
  });

  if (!result.success) {
    // Update payment status to failed
    payment.status = 'failed';
    await payment.save();
    throw new AppError(result.error || 'Failed to initiate payment', 500);
  }

  res.status(200).json({
    status: 'success',
    data: {
      paymentUrl: result.paymentUrl,
      transactionId,
    },
  });
});

/**
 * PhonePe payment callback (webhook)
 * POST /api/subscriptions/callback
 */
export const paymentCallback = catchAsync(async (req, res) => {
  const { response } = req.body;
  const xVerify = req.headers['x-verify'];

  // Verify callback signature
  if (!phonepeService.verifyCallback(response, xVerify)) {
    logger.warn('Invalid PhonePe callback signature');
    return res.status(400).json({ status: 'fail', message: 'Invalid signature' });
  }

  // Decode response
  const decodedResponse = phonepeService.decodeCallbackResponse(response);
  if (!decodedResponse) {
    logger.warn('Failed to decode PhonePe callback response');
    return res.status(400).json({ status: 'fail', message: 'Invalid response' });
  }

  const { merchantTransactionId, code, data } = decodedResponse;

  // Find payment record
  const payment = await Payment.findOne({ transactionId: merchantTransactionId });
  if (!payment) {
    logger.warn(`Payment not found for transaction: ${merchantTransactionId}`);
    return res.status(404).json({ status: 'fail', message: 'Payment not found' });
  }

  // Update payment status based on PhonePe response
  if (code === 'PAYMENT_SUCCESS') {
    payment.status = 'completed';
    payment.phonepeTransactionId = data?.transactionId;
    await payment.save();

    // Activate subscription
    await activateSubscription(payment.user, payment.plan);
    
    logger.info(`Payment completed for transaction: ${merchantTransactionId}`);
  } else if (code === 'PAYMENT_ERROR' || code === 'PAYMENT_DECLINED') {
    payment.status = 'failed';
    await payment.save();
    
    logger.info(`Payment failed for transaction: ${merchantTransactionId}`);
  }

  // PhonePe expects a 200 response
  res.status(200).json({ status: 'success' });
});

/**
 * Check payment/subscription status
 * GET /api/subscriptions/status/:transactionId
 */
export const checkStatus = catchAsync(async (req, res) => {
  const { transactionId } = req.params;

  // Find payment in our database
  let payment = await Payment.findOne({ transactionId });
  
  if (!payment) {
    throw new AppError('Payment not found', 404);
  }

  // If payment is pending, check with PhonePe
  if (payment.status === 'pending') {
    const statusResult = await phonepeService.checkPaymentStatus(transactionId);

    if (statusResult.status === 'completed') {
      payment.status = 'completed';
      payment.phonepeTransactionId = statusResult.phonepeTransactionId;
      await payment.save();

      // Activate subscription
      await activateSubscription(payment.user, payment.plan);
    } else if (statusResult.status === 'failed') {
      payment.status = 'failed';
      await payment.save();
    }
  }

  // Get user's current subscription status
  const user = await User.findById(payment.user);

  res.status(200).json({
    status: 'success',
    data: {
      payment: {
        transactionId: payment.transactionId,
        plan: payment.plan,
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.createdAt,
      },
      subscription: user?.subscription || null,
    },
  });
});

/**
 * Helper function to activate subscription
 */
const activateSubscription = async (userId, plan) => {
  const planDetails = PLANS[plan];
  if (!planDetails) {
    throw new Error(`Invalid plan: ${plan}`);
  }

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + planDetails.duration);

  await User.findByIdAndUpdate(userId, {
    subscription: {
      plan,
      startDate,
      endDate,
      isActive: true,
    },
  });

  logger.info(`Subscription activated for user ${userId}: ${plan} until ${endDate}`);
};

export default {
  getPlans,
  initiatePayment,
  paymentCallback,
  checkStatus,
};
