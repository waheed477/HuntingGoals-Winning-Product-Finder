import mongoose from 'mongoose';

const alertLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    alertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Alert',
      default: null,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    productName: { type: String, required: true },
    winScore:    { type: Number, required: true, min: 0, max: 100 },
    channel: {
      type: String,
      enum: ['email', 'whatsapp', 'both'],
      required: true,
    },
    sentAt:       { type: Date, default: Date.now },
    delivered:    { type: Boolean, default: true },
    errorMessage: { type: String, default: null },
  },
  { timestamps: false }
);

alertLogSchema.index({ userId: 1, sentAt: -1 });

const AlertLog = mongoose.models.AlertLog || mongoose.model('AlertLog', alertLogSchema);
export default AlertLog;
