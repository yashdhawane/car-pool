// models/BookingRequest.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IBookingRequest extends Document {
  rideId: string;
  passengerId: string;
  seats: number;
  status: 'pending' | 'accepted' | 'rejected';
  requestedAt: Date;
  respondedAt?: Date;
}

const BookingRequestSchema = new Schema({
  rideId: { type: Schema.Types.ObjectId, ref: 'Ride', required: true },
  passengerId: { type: String, required: true },
  seats: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },
  requestedAt: { type: Date, default: Date.now },
  respondedAt: { type: Date },
}, {
  timestamps: true,
});

export const BookingRequest = mongoose.model<IBookingRequest>('BookingRequest', BookingRequestSchema);
