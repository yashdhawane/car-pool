// ride-service/models/BookingRequest.ts

import mongoose from 'mongoose';

const bookingRequestSchema = new mongoose.Schema({
  rideId: { type: mongoose.Schema.Types.ObjectId, required: true },
  passengerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, required: true },
  seats: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model('BookingRequest', bookingRequestSchema);
