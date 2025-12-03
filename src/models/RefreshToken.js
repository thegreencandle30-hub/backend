import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
  jti: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'userModel' },
  userModel: { type: String, required: true, enum: ['User', 'Admin'] },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  revokedAt: { type: Date, default: null },
  replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'RefreshToken', default: null },
  ip: { type: String },
  userAgent: { type: String },
});

refreshTokenSchema.index({ jti: 1 });
refreshTokenSchema.index({ user: 1 });

export default mongoose.model('RefreshToken', refreshTokenSchema);
