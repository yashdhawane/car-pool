// models/DriverProfile.js
import mongoose from 'mongoose';

const driverProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // This references the User collection
    required: true,
    unique: true, // Ensure one-to-one mapping (1 user → 1 driver profile)
  },
  licenseNumber: { type: String, required: true },
  vehicle: {
    make: { type: String },
    model: { type: String },
    year: { type: Number },
    plateNumber: { type: String },
  },
  experienceYears: { type: Number },
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('DriverProfile', driverProfileSchema);
