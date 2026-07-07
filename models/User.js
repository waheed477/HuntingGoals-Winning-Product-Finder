import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const VALID_CATEGORIES = ['Fashion', 'Electronics', 'Beauty', 'Home', 'Grocery', 'Toys', 'Sports', 'Books'];
const VALID_PLATFORMS  = ['Facebook Ads', 'Daraz', 'TikTok Shop', 'Instagram', 'OLX'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: function () { return this.authProvider !== 'google'; },
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    telegramChatId: { type: String, default: null },
    phoneNumber: {
      type: String,
      default: null,
    },
    // Notification preferences
    emailNotifications:    { type: Boolean, default: true },
    telegramNotifications: { type: Boolean, default: false },
    whatsappNotifications: { type: Boolean, default: false },
    dailyDigest:           { type: Boolean, default: false },
    digestTime:            { type: String,  default: '08:00' },
    // Business preferences
    selectedCategories: {
      type: [String],
      enum: VALID_CATEGORIES,
      default: [],
    },
    selectedCity: { type: String, default: null },
    selectedPlatforms: {
      type: [String],
      enum: VALID_PLATFORMS,
      default: [],
    },
    // Subscription & API access
    subscriptionPlan: {
      type: String,
      enum: ['free', 'pro', 'business'],
      default: 'free',
    },
    apiKey:             { type: String },
    apiKeyGeneratedAt:  { type: Date },
    apiKeyLastUsed:     { type: Date },
    profilePicture:     { type: String, default: null },
    role:     { type: String, enum: ['user', 'admin'], default: 'user' },
    isActive:            { type: Boolean, default: true },
    lastLogin:           { type: Date },
    onboardingCompleted: { type: Boolean, default: false },
    emailVerified:       { type: Boolean, default: false },
    // Google OAuth
    googleId:       { type: String, unique: true, sparse: true },
    googleEmail:    { type: String, sparse: true },
    authProvider:   { type: String, enum: ['email', 'google'], default: 'email' },
    // Password reset tokens (token-based, separate from OTP flow)
    resetPasswordToken:   { type: String },
    resetPasswordExpires: { type: Date },
    // GDPR compliance
    gdprExportedAt:  { type: Date, default: null },
    gdprRequested:   { type: Boolean, default: false },
    gdprRequestedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ isActive: 1 });
userSchema.index({ role: 1 });
userSchema.index({ apiKey: 1 }, { unique: true, sparse: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
