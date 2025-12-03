import jwt from 'jsonwebtoken';
import AppError from '../utils/app-error.js';
import env from '../config/env.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import RefreshToken from '../models/RefreshToken.js';
import crypto from 'crypto';

/**
 * Verify JWT token and attach user to request
 */
export const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('No token provided', 401));
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, env.jwt.secret);
    
    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new AppError('User no longer exists', 401));
    }
    
    // Check if user is active
    if (!user.isActive) {
      return next(new AppError('User account is disabled', 403));
    }
    
    // Attach user to request
    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401));
    }
    next(error);
  }
};

/**
 * Verify admin JWT token and attach admin to request
 */
export const verifyAdminToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('No token provided', 401));
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, env.jwt.secret);
    
    // Check if this is an admin token
    if (decoded.type !== 'admin') {
      return next(new AppError('Access denied. Admin privileges required.', 403));
    }
    
    // Check if admin still exists
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return next(new AppError('Admin no longer exists', 401));
    }
    
    // Attach admin to request
    req.admin = admin;
    req.adminId = admin._id;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401));
    }
    next(error);
  }
};

/**
 * Check if user has active subscription
 */
export const requireActiveSubscription = async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }
  
  if (!req.user.hasActiveSubscription) {
    return next(new AppError('Active subscription required', 403));
  }
  
  next();
};

/**
 * Generate JWT access token
 * @param {string} id - User or Admin ID
 * @param {string} type - Token type ('user' or 'admin')
 * @returns {string} JWT token
 */
export const generateAccessToken = (id, type = 'user') => {
  return jwt.sign(
    { id, type },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
};

/**
 * Generate JWT refresh token
 * @param {string} id - User or Admin ID
 * @param {string} type - Token type ('user' or 'admin')
 * @returns {string} JWT refresh token
 */
export const generateRefreshToken = async (id, type = 'user', meta = {}) => {
  const jti = crypto.randomBytes(16).toString('hex');
  const token = jwt.sign({ id, type, jti }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn });
  const decoded = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000);
  // Store token record in DB for rotation / revocation
  const tokenRecord = await RefreshToken.create({
    jti,
    user: id,
    userModel: type === 'admin' ? 'Admin' : 'User',
    expiresAt,
    ip: meta.ip || null,
    userAgent: meta.userAgent || null,
  });
  return { token, tokenRecord };
};

/**
 * Verify refresh token
 * @param {string} token - Refresh token
 * @returns {Object} Decoded token payload
 */
export const verifyRefreshToken = async (token) => {
  const decoded = jwt.verify(token, env.jwt.refreshSecret);

  // Check the token record exists and is still valid
  const tokenRecord = await RefreshToken.findOne({ jti: decoded.jti });
  if (!tokenRecord) {
    throw new AppError('Refresh token not recognized', 401);
  }
  if (tokenRecord.revokedAt) {
    throw new AppError('Refresh token revoked', 401);
  }
  if (new Date() > tokenRecord.expiresAt) {
    throw new AppError('Refresh token expired', 401);
  }

  return { decoded, tokenRecord };
};

export default {
  verifyToken,
  verifyAdminToken,
  requireActiveSubscription,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
};
