import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    city: {
      type: String,
      default: null, // null = all cities
      index: true,
    },
    category: {
      type: String,
      default: null, // null = all categories
      index: true,
    },
    minWinScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 75,
    },
    channel: {
      type: String,
      enum: ['email', 'whatsapp', 'both'],
      default: 'email',
    },
    isActive: { type: Boolean, default: true },
    lastTriggeredAt: { type: Date, default: null },
    triggerCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Compound indexes for fast lookups
alertSchema.index({ userId: 1, isActive: 1 });
alertSchema.index({ city: 1, category: 1, minWinScore: 1 });

// Static: all alerts for a user
alertSchema.statics.findByUser = function (userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Static: all active alerts (for the scheduler job)
alertSchema.statics.findActiveAlerts = function () {
  return this.find({ isActive: true }).populate('userId', 'email phoneNumber');
};

// Static: check if a product triggers any active alerts; returns matched alerts
alertSchema.statics.checkAndTrigger = async function (product) {
  const alerts = await this.find({ isActive: true }).populate(
    'userId',
    'email phoneNumber emailNotifications whatsappNotifications'
  );

  const triggered = alerts.filter((alert) => {
    const scoreOk = product.winScore >= alert.minWinScore;
    const cityOk = !alert.city || (product.cities && product.cities.includes(alert.city));
    const catOk = !alert.category || product.category === alert.category;
    return scoreOk && cityOk && catOk;
  });

  // Update trigger metadata on matched alerts
  if (triggered.length > 0) {
    const ids = triggered.map((a) => a._id);
    await this.updateMany(
      { _id: { $in: ids } },
      { $set: { lastTriggeredAt: new Date() }, $inc: { triggerCount: 1 } }
    );
  }

  return triggered;
};

const Alert = mongoose.models.Alert || mongoose.model('Alert', alertSchema);
export default Alert;
