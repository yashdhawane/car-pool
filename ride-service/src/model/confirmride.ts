// src/model/confirmedRide.ts
import mongoose ,{Schema}from 'mongoose';

const LocationSchema = new Schema({
    address: { type: String, required: true },
    city: { type: String, required: true },
    coordinates: {
        type: [Number],
        required: true,
        validate: {
            validator: (v: number[]) => v.length === 2,
            message: 'Coordinates must be [longitude, latitude]'
        }
    }
}, { _id: false });

const confirmedRideSchema = new mongoose.Schema({
    rideId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ride',
        required: true
    },
    passengerId: {
        type: String,
        required: true
    },
    driverId: {
        type: String,
        required: true
    },
    source: {
        type: LocationSchema,  // Changed from Object to LocationSchema
        required: true
    },
    destination: {
        type: LocationSchema,  // Changed from Object to LocationSchema
        required: true
    },
    seats: {
        type: Number,
        required: true
    },
    bookingTime: {
        type: Date,
        required: true
    },
    confirmationTime: {
        type: Date,
        default: Date.now
    },
    fare: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['started', 'completed', 'cancelled'],
        default: 'started'
    },
    // Can be used when payment service is added
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    }
}, {
    timestamps: true
});

export const ConfirmedRide = mongoose.model('ConfirmedRide', confirmedRideSchema);