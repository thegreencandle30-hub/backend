import Admin from '../models/Admin.js';
import AppError from '../utils/app-error.js';
import { catchAsync } from '../utils/helpers.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../middlewares/auth-middleware.js';

/**
 * Admin login with email/password
 * POST /api/auth/admin/login
 */
export const adminLogin = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  
  // Find admin with password
  const admin = await Admin.findOne({ email }).select('+password');
  
  if (!admin) {
    throw new AppError('Invalid email or password', 401);
  }
  
  // Check password
  const isPasswordValid = await admin.comparePassword(password);
  
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }
  
  // Generate tokens
  const accessToken = generateAccessToken(admin._id, 'admin');
  const { token: refreshToken } = await generateRefreshToken(admin._id, 'admin', { ip: req.ip, userAgent: req.headers['user-agent'] });
  
  res.status(200).json({
    status: 'success',
    data: {
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
      },
      accessToken,
      refreshToken,
    },
  });
});

/**
 * Refresh admin access token using refresh token
 * POST /api/auth/admin/refresh
 */
export const adminRefreshToken = catchAsync(async (req, res) => {
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
  if (decoded.type !== 'admin') {
    throw new AppError('Invalid token type', 401);
  }
  
  // Find admin
  const admin = await Admin.findById(decoded.id);
  if (!admin) {
    throw new AppError('Admin not found', 401);
  }
  
  // Generate new tokens
  const newAccessToken = generateAccessToken(admin._id, 'admin');
  const { token: newRefreshToken, tokenRecord: newRefreshRecord } = await generateRefreshToken(admin._id, 'admin', { ip: req.ip, userAgent: req.headers['user-agent'] });

  // Revoke previous refresh token and link to new one
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
 * Admin logout (revoke refresh token)
 * POST /api/auth/admin/logout
 */
export const adminLogout = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;

  let verification;
  try {
    verification = await verifyRefreshToken(refreshToken);
  } catch (error) {
    return res.status(200).json({ status: 'success' });
  }

  const { tokenRecord } = verification;
  tokenRecord.revokedAt = new Date();
  await tokenRecord.save();

  res.status(200).json({ status: 'success' });
});

/**
 * Get current admin profile
 * GET /api/admin/me
 */
export const getCurrentAdmin = catchAsync(async (req, res) => {
  const admin = req.admin;
  
  res.status(200).json({
    status: 'success',
    data: {
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        createdAt: admin.createdAt,
      },
    },
  });
});

export default {
  adminLogin,
  adminRefreshToken,
  adminLogout,
  getCurrentAdmin,
};
