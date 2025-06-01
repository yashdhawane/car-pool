// import mongoose, { Schema, Document } from 'mongoose';

// export interface IRide extends Document {
//     driverId: string;
//     origin: string;
//     destination: string;
//     departureTime: Date;
//     availableSeats: number;
//     price: number;
//     status: 'available' | 'cancelled' | 'completed';
//     passengers: string[];
//     createdAt: Date;
//     updatedAt?: Date;
// }

// const RideSchema = new Schema({
//     driverId: { type: String, required: true },
//     origin: { type: String, required: true },
//     destination: { type: String, required: true },
//     departureTime: { type: Date, required: true },
//     availableSeats: { type: Number, required: true, min: 1 },
//     price: { type: Number, required: true, min: 0 },
//     status: { 
//         type: String, 
//         enum: ['available', 'cancelled', 'completed'],
//         default: 'available'
//     },
//     passengers: [{ type: String }],
//     createdAt: { type: Date, default: Date.now },
//     updatedAt: { type: Date }
// });

// export const Ride = mongoose.model<IRide>('Ride', RideSchema);


import mongoose, { Schema, Document } from 'mongoose';

interface ILocation {
    address: string;
    city: string;
    coordinates: [number, number];  // [longitude, latitude]
}

export interface IRide extends Document {
    driverId: string;
    origin: ILocation;
    destination: ILocation;
    departureTime: Date;
    availableSeats: number;
    price: number;
    status: 'available' | 'booked' | 'cancelled' | 'completed';
    passengers: Array<{
        userId: string;
        bookingTime: Date;
        seats: number;
    }>;
    createdAt: Date;
    updatedAt?: Date;
}

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

const PassengerSchema = new Schema({
    userId: { type: String, required: true },
    bookingTime: { type: Date, default: Date.now },
    seats: { type: Number, required: true, min: 1 }
}, { _id: false });

const RideSchema = new Schema({
    driverId: { 
        type: String, 
        required: [true, 'Driver ID is required'],
        index: true 
    },
    origin: { 
        type: LocationSchema, 
        required: [true, 'Origin location is required'] 
    },
    destination: { 
        type: LocationSchema, 
        required: [true, 'Destination location is required'] 
    },
    departureTime: { 
        type: Date, 
        required: [true, 'Departure time is required'],
        validate: {
            validator: (v: Date) => v > new Date(),
            message: 'Departure time must be in the future'
        }
    },
    availableSeats: { 
        type: Number, 
        required: [true, 'Available seats is required'], 
        min: [1, 'Must have at least 1 seat'],
        max: [8, 'Cannot exceed 8 seats']
    },
    price: { 
        type: Number, 
        required: [true, 'Price is required'], 
        min: [0, 'Price cannot be negative']
    },
    status: { 
        type: String, 
        enum: ['available', 'booked', 'cancelled', 'completed'],
        default: 'available',
        index: true
    },
    passengers: [PassengerSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date }
}, {
    timestamps: true
});

// Indexes for better query performance
RideSchema.index({ departureTime: 1 });
RideSchema.index({ "origin.city": 1 });
RideSchema.index({ "destination.city": 1 });

// Validate total booked seats don't exceed available seats
RideSchema.pre('save', function(next) {
    const totalBookedSeats = this.passengers.reduce((sum, passenger) => sum + passenger.seats, 0);
    if (totalBookedSeats > this.availableSeats) {
        next(new Error('Total booked seats cannot exceed available seats'));
    }
    next();
});

export const Ride = mongoose.model<IRide>('Ride', RideSchema);