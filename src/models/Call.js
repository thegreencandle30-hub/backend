import mongoose from 'mongoose';

const callSchema = new mongoose.Schema({
  commodity: {
    type: String,
    enum: ['gold', 'silver', 'nifty', 'copper'],
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['buy', 'sell'],
    required: true,
  },
  entryPrice: {
    type: Number,
    required: true,
  },
  target: {
    type: Number,
    required: true,
  },
  stopLoss: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'hit_target', 'hit_stoploss', 'expired'],
    default: 'active',
    index: true,
  },
  date: {
    type: Date,
    required: true,
    index: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
}, {
  timestamps: true,
});

// Compound index for date-based queries
callSchema.index({ date: -1, commodity: 1 });
callSchema.index({ status: 1, date: -1 });

const Call = mongoose.model('Call', callSchema);

export default Call;
