import mongoose from 'mongoose';

const subscriptionQueueSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed'],
    default: 'pending',
    index: true,
  },
  queuePosition: {
    type: Number,
    required: true,
  },
  activationDate: {
    type: Date,
  },
  expiryDate: {
    type: Date,
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true,
  }
}, {
  timestamps: true,
});

// Index to find user's active plan quickly
subscriptionQueueSchema.index({ user: 1, status: 1 });
// Index to find users who need their plans rotated
subscriptionQueueSchema.index({ status: 1, expiryDate: 1 });

const SubscriptionQueue = mongoose.model('SubscriptionQueue', subscriptionQueueSchema);

export default SubscriptionQueue;
