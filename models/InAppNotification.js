import mongoose from 'mongoose';

const inAppNotificationSchema = new mongoose.Schema({
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    index:    true,
  },
  type: {
    type:     String,
    enum:     ['alert', 'daily_digest', 'system', 'product_update'],
    required: true,
  },
  title:     { type: String, required: true },
  message:   { type: String, required: true },
  link:      { type: String, default: null },
  read:      { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true },
});

// Auto-delete after 30 days (TTL index)
inAppNotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export default mongoose.models.InAppNotification ||
  mongoose.model('InAppNotification', inAppNotificationSchema);
