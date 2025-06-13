// models/BookingRequest.ts
import { required } from 'joi';
import mongoose, { Schema, Document } from 'mongoose';

export interface IBookingRequest extends Document {
  rideId: string;
  passengerId: string;
  seats: number;
  status: 'pending' | 'accepted' | 'rejected';
  email: string;
  name: string; // Optional field for passenger's name
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
  email: { type: String, required: true },
  name: { type: String,required:true }, // Optional field for passenger's name
  requestedAt: { type: Date, default: Date.now },
  respondedAt: { type: Date },
}, {
  timestamps: true,
});

export const BookingRequest = mongoose.model<IBookingRequest>('BookingRequest', BookingRequestSchema);
