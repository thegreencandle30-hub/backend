import User from '../models/User.js';
import Payment from '../models/Payment.js';
import AppError from '../utils/app-error.js';
import { catchAsync, parsePagination, formatPaginationResponse } from '../utils/helpers.js';

/**
 * Get all users with pagination
 * GET /api/admin/users
 */
export const getAllUsers = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { search, subscriptionStatus } = req.query;
  
  // Build filter
  const filter = {};
  
  if (search) {
    filter.mobile = { $regex: search, $options: 'i' };
  }
  
  if (subscriptionStatus === 'active') {
    filter['subscription.isActive'] = true;
    filter['subscription.endDate'] = { $gt: new Date() };
  } else if (subscriptionStatus === 'inactive') {
    filter.$or = [
      { 'subscription.isActive': false },
      { 'subscription.endDate': { $lte: new Date() } },
    ];
  }
  
  // Execute query with pagination
  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v'),
    User.countDocuments(filter),
  ]);
  
  res.status(200).json({
    status: 'success',
    ...formatPaginationResponse(users, total, page, limit),
  });
});

/**
 * Get single user by ID
 * GET /api/admin/users/:id
 */
export const getUserById = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const user = await User.findById(id).select('-__v');
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

/**
 * Update user status (enable/disable)
 * PATCH /api/admin/users/:id/status
 */
export const updateUserStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  
  const user = await User.findByIdAndUpdate(
    id,
    { isActive },
    { new: true, runValidators: true }
  ).select('-__v');
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

/**
 * Get user payment history
 * GET /api/admin/users/:id/payments
 */
export const getUserPayments = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { page, limit, skip } = parsePagination(req.query);
  
  // Verify user exists
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  // Get payments
  const [payments, total] = await Promise.all([
    Payment.find({ user: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v'),
    Payment.countDocuments({ user: id }),
  ]);
  
  res.status(200).json({
    status: 'success',
    ...formatPaginationResponse(payments, total, page, limit),
  });
});

/**
 * Activate subscription manually (for admin)
 * POST /api/admin/users/:id/activate-subscription
 */
export const activateSubscription = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { plan } = req.body;
  
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  const durationDays = plan === 'daily' ? 1 : 7;
  const now = new Date();
  
  user.subscription = {
    plan,
    startDate: now,
    endDate: new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000),
    isActive: true,
  };
  
  await user.save();
  
  res.status(200).json({
    status: 'success',
    message: 'Subscription activated successfully',
    data: { user },
  });
});

export default {
  getAllUsers,
  getUserById,
  updateUserStatus,
  getUserPayments,
  activateSubscription,
};
