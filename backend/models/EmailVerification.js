import mongoose from 'mongoose';

const emailVerificationSchema = new mongoose.Schema({
  email:     { type: String, required: true, index: true },
  otp:       { type: String, required: true },
  purpose:   { type: String, enum: ['verification', 'reset'], default: 'verification' },
  expiresAt: { type: Date,   required: true },
  createdAt: { type: Date,   default: Date.now },
});

emailVerificationSchema.index({ email: 1, purpose: 1 });
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.EmailVerification ||
  mongoose.model('EmailVerification', emailVerificationSchema);
