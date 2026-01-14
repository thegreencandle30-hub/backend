import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  plan: {
    type: String,
    required: true,
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
    index: true,
  },
  transactionId: {
    type: String,
    required: true,
    unique: true,
  },
  phonepeTransactionId: {
    type: String,
    default: null,
  },
  isNewUser: {
    type: Boolean,
    default: false,
  },
  tempPassword: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// Index for querying user payments
paymentSchema.index({ user: 1, createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
