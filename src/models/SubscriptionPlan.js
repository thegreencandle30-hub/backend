import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true,
  },
  tier: {
    type: String,
    enum: ['Regular', 'Premium', 'International'],
    required: [true, 'Plan tier is required'],
  },
  durationDays: {
    type: Number,
    required: [true, 'Duration in days is required'],
  },
  durationLabel: {
    type: String, // e.g., '1 Day', '7 Days'
    required: [true, 'Duration label is required'],
  },
  price: {
    type: Number,
    required: [true, 'Plan price is required'],
  },
  currency: {
    type: String,
    enum: ['INR', 'USD'],
    default: 'INR',
  },
  maxTargetsVisible: {
    type: Number,
    required: [true, 'Number of targets visible is required'],
    default: 2,
  },
  reminderHours: {
    type: Number,
    required: [true, 'Reminder hours is required'],
    default: 24, // 2 for daily, 24 for weekly as per requirement
  },
  isActive: {
    type: Boolean,
    default: true,
  }
}, {
  timestamps: true,
});

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

export default SubscriptionPlan;
