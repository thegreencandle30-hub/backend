import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  mobile: {
    type: String,
    required: true,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  subscription: {
    plan: {
      type: String,
      enum: ['daily', 'weekly', null],
      default: null,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  fcmToken: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// Index for subscription queries
userSchema.index({ 'subscription.isActive': 1, 'subscription.endDate': 1 });

// Virtual to check if subscription is valid
userSchema.virtual('hasActiveSubscription').get(function() {
  if (!this.subscription.isActive || !this.subscription.endDate) {
    return false;
  }
  return new Date() < this.subscription.endDate;
});

// Ensure virtuals are included in JSON output
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model('User', userSchema);

export default User;
