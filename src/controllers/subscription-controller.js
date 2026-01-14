import User from '../models/User.js';
import Payment from '../models/Payment.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import SubscriptionQueue from '../models/SubscriptionQueue.js';
import phonepeService from '../services/phonepe-service.js';
import AppError from '../utils/app-error.js';
import { catchAsync } from '../utils/helpers.js';
import logger from '../utils/logger.js';
import env from '../config/env.js';
import crypto from 'crypto';
import moment from 'moment';

/**
 * Register a new user and initiate subscription payment
 * POST /api/subscriptions/register
 */
export const registerAndSubscribe = catchAsync(async (req, res, next) => {
  const { fullName, mobile, planId } = req.body;

  // 1) Check if user already exists
  let user = await User.findOne({ mobile });
  let isNewUser = false;
  let password = null;

  if (!user) {
    isNewUser = true;
    password = crypto.randomBytes(4).toString('hex'); // 8-char hex
    
    user = await User.create({
      fullName,
      mobile,
      password, // This will be hashed by pre-save hook
      isActive: false, // Only becomes active after payment
    });
  }

  // 2) Get plan details
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) {
    return next(new AppError('Invalid subscription plan', 400));
  }

  // 3) Create pending payment record
  const transactionId = phonepeService.generateTransactionId();
  const amount = plan.price;

  const payment = await Payment.create({
    user: user._id,
    planId: plan._id,
    plan: plan.name, // Display name
    amount,
    currency: plan.currency,
    status: 'pending',
    transactionId,
    isNewUser,
    tempPassword: password,
  });

  // Callback and Redirect URLs
  const callbackUrl = `${env.apiBaseUrl}/api/subscriptions/callback`;
  const redirectUrl = isNewUser 
    ? `${env.adminCorsOrigin}/payment/status?transactionId=${transactionId}&new_user=true&pwd=${password}`
    : `${env.adminCorsOrigin}/payment/status?transactionId=${transactionId}`;

  // 4) Initiate PhonePe payment
  const result = await phonepeService.initiatePayment({
    transactionId,
    amount,
    userId: user._id.toString(),
    mobile: user.mobile,
    callbackUrl,
    redirectUrl,
  });

  if (!result.success) {
    payment.status = 'failed';
    await payment.save();
    return next(new AppError(result.error || 'Failed to initiate payment', 500));
  }

  res.status(200).json({
    status: 'success',
    data: {
      paymentUrl: result.paymentUrl,
      transactionId,
      temp_password: isNewUser ? password : undefined // Only for new users
    },
  });
});

/**
 * Initiate subscription payment for logged-in user
 * POST /api/subscriptions/initiate
 */
export const initiatePayment = catchAsync(async (req, res, next) => {
  const { planId } = req.body;
  const user = req.user;

  // 1) Get plan details
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) {
    return next(new AppError('Invalid subscription plan', 400));
  }

  // 2) Generate transaction ID
  const transactionId = phonepeService.generateTransactionId();
  const amount = plan.price;

  // 3) Create pending payment record
  const payment = await Payment.create({
    user: user._id,
    planId: plan._id,
    plan: plan.name,
    amount,
    currency: plan.currency,
    status: 'pending',
    transactionId,
  });

  // Callback URLs
  const callbackUrl = `${env.apiBaseUrl}/api/subscriptions/callback`;
  const redirectUrl = `${env.adminCorsOrigin}/payment/status?transactionId=${transactionId}`;

  // 4) Initiate PhonePe payment
  const result = await phonepeService.initiatePayment({
    transactionId,
    amount,
    userId: user._id.toString(),
    mobile: user.mobile,
    callbackUrl,
    redirectUrl,
  });

  if (!result.success) {
    payment.status = 'failed';
    await payment.save();
    return next(new AppError(result.error || 'Failed to initiate payment', 500));
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
 */
export const paymentCallback = catchAsync(async (req, res) => {
  const { request } = req.body;
  const xVerify = req.headers['x-verify'];

  if (!phonepeService.verifyCallback(request, xVerify)) {
    logger.warn('Invalid PhonePe callback signature');
    return res.status(400).json({ status: 'fail', message: 'Invalid signature' });
  }

  const decodedResponse = phonepeService.decodeCallbackResponse(request);
  if (!decodedResponse) {
    return res.status(400).json({ status: 'fail', message: 'Invalid response' });
  }

  const { merchantTransactionId, code, data } = decodedResponse;
  const payment = await Payment.findOne({ transactionId: merchantTransactionId });
  if (!payment) {
    return res.status(404).json({ status: 'fail', message: 'Payment not found' });
  }

  if (code === 'PAYMENT_SUCCESS') {
    payment.status = 'completed';
    payment.phonepeTransactionId = data?.transactionId;
    await payment.save();

    // Activate user and queue plan
    await activateAndQueuePlan(payment.user, merchantTransactionId, payment._id);
    
    logger.info(`Payment completed for transaction: ${merchantTransactionId}`);
  } else if (code === 'PAYMENT_ERROR' || code === 'PAYMENT_DECLINED') {
    payment.status = 'failed';
    await payment.save();
  }

  res.status(200).json({ status: 'success' });
});

/**
 * Check payment status and return credentials if successful
 * GET /api/subscriptions/status/:transactionId
 */
export const checkStatus = catchAsync(async (req, res) => {
  const { transactionId } = req.params;
  const payment = await Payment.findOne({ transactionId });
  
  if (!payment) {
    throw new AppError('Payment not found', 404);
  }

  if (payment.status === 'pending') {
    const statusResult = await phonepeService.checkPaymentStatus(transactionId);
    if (statusResult.status === 'completed') {
      payment.status = 'completed';
      payment.phonepeTransactionId = statusResult.phonepeTransactionId;
      await payment.save();
      await activateAndQueuePlan(payment.user, transactionId, payment._id);
    } else if (statusResult.status === 'failed') {
      payment.status = 'failed';
      await payment.save();
    }
  }

  const user = await User.findById(payment.user);
  const queue = await SubscriptionQueue.find({ user: user._id }).sort({ queuePosition: 1 }).populate('planId');

  res.status(200).json({
    status: 'success',
    data: {
      payment: {
        status: payment.status,
      },
      user: {
        displayId: user.displayId,
        // password is only returned in this specific context after successful payment
        // only if it's a new user and payment is completed.
        temp_password: (payment.status === 'completed' && payment.isNewUser) ? payment.tempPassword : undefined,
      },
      currentSubscription: user.subscription,
      queue: queue,
    },
  });
});

/**
 * Helper to activate user and queue the plan
 */
async function activateAndQueuePlan(userId, transactionId, paymentId) {
  // 1) Find the user and make them active
  const user = await User.findByIdAndUpdate(userId, { isActive: true }, { new: true });
  
  // 2) Find the payment and the plan
  const payment = await Payment.findById(paymentId).populate('planId');
  const plan = payment.planId;
  
  if (!plan) {
    logger.error(`No planId found for payment ${paymentId}`);
    return;
  }
  
  // 3) Calculate queue position and dates
  const activeOrPending = await SubscriptionQueue.findOne({
    user: userId,
    status: { $in: ['active', 'pending'] }
  }).sort({ queuePosition: -1 });

  const lastEntryOverall = await SubscriptionQueue.findOne({ user: userId }).sort({ queuePosition: -1 });
  const position = lastEntryOverall ? lastEntryOverall.queuePosition + 1 : 1;
  const status = !activeOrPending ? 'active' : 'pending';
  
  let activationDate, expiryDate;
  if (status === 'active') {
    activationDate = new Date();
  } else {
    activationDate = activeOrPending.expiryDate > new Date() ? activeOrPending.expiryDate : new Date();
  }
  
  expiryDate = moment(activationDate).add(plan.durationDays, 'days').toDate();

  await SubscriptionQueue.create({
    user: userId,
    planId: plan._id,
    status,
    queuePosition: position,
    activationDate,
    expiryDate,
    paymentId: payment._id
  });

  if (status === 'active') {
    await User.findByIdAndUpdate(userId, {
      subscription: {
        planTier: plan.tier,
        startDate: activationDate,
        endDate: expiryDate,
        isActive: true,
        maxTargetsVisible: plan.maxTargetsVisible,
        reminderHours: plan.reminderHours,
        reminderSent: false
      }
    });
  }
}

export default {
  registerAndSubscribe,
  initiatePayment,
  paymentCallback,
  checkStatus,
};
