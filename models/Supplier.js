import mongoose from 'mongoose';

const VALID_CATEGORIES = ['Fashion', 'Electronics', 'Beauty', 'Home', 'Grocery', 'Toys', 'Sports', 'Books', 'General'];
const VALID_CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Rawalpindi', 'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala'];

const supplierSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true, index: true },
    city:     { type: String, enum: VALID_CITIES, index: true },
    category: { type: String, enum: VALID_CATEGORIES, index: true },
    phone:    { type: String, default: null },
    email:    { type: String, default: null, lowercase: true },
    website:  { type: String, default: null },
    address:  { type: String, default: null },
    products: [{ type: String }],
    rating:   { type: Number, min: 0, max: 5, default: 0 },
    verified: { type: Boolean, default: false },
    sourceUrl: { type: String, default: null },

    // Who added this supplier
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // How the supplier entered the system
    sourceType: {
      type: String,
      enum: ['scraper', 'user', 'admin'],
      default: 'scraper',
    },

    // Admin verification workflow
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
      index: true,
    },

    // Optional review note left by admin
    reviewNote: { type: String, default: null },
  },
  { timestamps: true }
);

supplierSchema.index({ city: 1, category: 1 });
supplierSchema.index({ name: 'text', products: 'text' });

const Supplier = mongoose.models.Supplier || mongoose.model('Supplier', supplierSchema);
export default Supplier;
