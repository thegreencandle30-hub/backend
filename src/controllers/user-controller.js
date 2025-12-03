import User from '../models/User.js';
import AppError from '../utils/app-error.js';
import { catchAsync } from '../utils/helpers.js';

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
  updateFcmToken,
};
