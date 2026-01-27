import User from '../models/User.js';
import AppError from '../utils/app-error.js';
import { catchAsync } from '../utils/helpers.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../middlewares/auth-middleware.js';

/**
 * Login user using displayId and password
 * POST /api/auth/login
 */
export const login = catchAsync(async (req, res, next) => {
  const { displayId, mobile, password } = req.body;

  // 1) Check if identifier (displayId or mobile) and password exist
  if ((!displayId && !mobile) || !password) {
    return next(new AppError('Please provide Phone number and password', 400));
  }

  // 2) Check if user exists && password is correct
  let query = {};
  if (mobile) {
    query.mobile = mobile;
  } else {
    query.displayId = displayId.toUpperCase();
  }

  const user = await User.findOne(query).select('+password');

  if (!user || !(await user.comparePassword(password, user.password))) {
    return next(new AppError('Incorrect login details or password', 401));
  }

  // 3) Check if user is active
  if (!user.isActive) {
    return next(new AppError('Your account has been disabled', 403));
  }

  // 4) If everything ok, send token to client
  const accessToken = generateAccessToken(user._id, 'user');
  const { token: refreshToken } = await generateRefreshToken(user._id, 'user', { 
    ip: req.ip, 
    userAgent: req.headers['user-agent'] 
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: user._id,
        displayId: user.displayId,
        mobile: user.mobile,
        fullName: user.fullName,
        isActive: user.isActive,
        subscription: user.subscription,
        hasActiveSubscription: user.hasActiveSubscription,
      },
      accessToken,
      refreshToken,
    },
  });
});

/**
 * Change password
 * POST /api/auth/change-password
 */
export const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // 1) Get user from collection
  const user = await User.findById(req.userId).select('+password');

  // 2) Check if posted current password is correct
  if (!(await user.comparePassword(currentPassword, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }

  // 3) Update password
  user.password = newPassword;
  await user.save();

  // 4) Log user in (send JWT)
  const accessToken = generateAccessToken(user._id, 'user');
  const { token: refreshToken } = await generateRefreshToken(user._id, 'user', { 
    ip: req.ip, 
    userAgent: req.headers['user-agent'] 
  });

  res.status(200).json({
    status: 'success',
    data: {
      accessToken,
      refreshToken,
    },
  });
});

/**
 * Refresh access token using refresh token
 * POST /api/auth/refresh
 */
export const refreshAccessToken = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  
  // Verify refresh token
  let decoded; let tokenRecord;
  try {
    const verification = await verifyRefreshToken(refreshToken);
    decoded = verification.decoded;
    tokenRecord = verification.tokenRecord;
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', 401);
  }
  
  // Check token type
  if (decoded.type !== 'user') {
    throw new AppError('Invalid token type', 401);
  }
  
  // Find user
  const user = await User.findById(decoded.id);
  if (!user) {
    throw new AppError('User not found', 401);
  }
  
  // Check if user is active
  if (!user.isActive) {
    throw new AppError('Your account has been disabled', 403);
  }
  
  // Generate new tokens
  const newAccessToken = generateAccessToken(user._id, 'user');
  const { token: newRefreshToken, tokenRecord: newRefreshRecord } = await generateRefreshToken(user._id, 'user', { ip: req.ip, userAgent: req.headers['user-agent'] });

  // Revoke previous refresh token and mark rotation
  tokenRecord.revokedAt = new Date();
  tokenRecord.replacedBy = newRefreshRecord._id;
  await tokenRecord.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    },
  });
});

/**
 * Logout (revoke refresh token)
 * POST /api/auth/logout
 */
export const logout = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;

  let verification;
  try {
    verification = await verifyRefreshToken(refreshToken);
  } catch (error) {
    // If invalid, return success to avoid token fishing
    return res.status(200).json({ status: 'success' });
  }

  const { tokenRecord } = verification;
  tokenRecord.revokedAt = new Date();
  await tokenRecord.save();

  res.status(200).json({ status: 'success' });
});

export default {
  login,
  changePassword,
  refreshAccessToken,
  logout,
};
