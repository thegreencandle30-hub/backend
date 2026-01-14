import User from '../models/User.js';
import Payment from '../models/Payment.js';
import AppError from '../utils/app-error.js';
import { catchAsync } from '../utils/helpers.js';
import moment from 'moment-timezone';

/**
 * Get current user profile
 * GET /api/users/me
 */
export const getCurrentUser = catchAsync(async (req, res) => {
  const user = req.user;
  
  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: user._id,
        displayId: user.displayId,
        fullName: user.fullName,
        mobile: user.mobile,
        isActive: user.isActive,
        subscription: user.subscription,
        hasActiveSubscription: user.hasActiveSubscription,
        createdAt: user.createdAt,
      },
    },
  });
});

/**
 * Export user transactions to CSV
 * GET /api/users/me/transactions/export
 */
export const exportTransactions = catchAsync(async (req, res) => {
  const userId = req.userId;
  const payments = await Payment.find({ user: userId, status: 'completed' }).sort({ createdAt: -1 });

  let csv = 'Date (IST),Plan Type,Amount,Currency,Status,Transaction ID\n';
  
  payments.forEach(p => {
    const dateIST = moment(p.createdAt).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    csv += `${dateIST},${p.plan},${p.amount},${p.currency},${p.status},${p.transactionId}\n`;
  });

  res.header('Content-Type', 'text/csv');
  res.attachment('transactions.csv');
  return res.send(csv);
});

/**
 * Update FCM token
 * PUT /api/users/me/fcm-token
 */
export const updateFcmToken = catchAsync(async (req, res) => {
  const { fcmToken } = req.body;
  const userId = req.userId;
  
  const user = await User.findByIdAndUpdate(
    userId,
    { fcmToken },
    { new: true, runValidators: true }
  );
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  res.status(200).json({
    status: 'success',
    message: 'FCM token updated successfully',
  });
});

export default {
  getCurrentUser,
  exportTransactions,
  updateFcmToken,
};
