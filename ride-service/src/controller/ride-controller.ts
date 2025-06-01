import { Request, Response } from 'express';
import { Ride } from '../model/Ride';
import { logger } from '../utils/logger';
import { createRideSchema } from '../utils/validation';
import mongoose from 'mongoose';
import { getChannel } from '../utils/rabbitmq';
import { BookingRequest } from '../model/bookingrequest'; // new model

// Create a new ride
export const createRide = async (req: Request, res: Response) => {
    logger.info(`Creating new ride for user ${req.user?.userId}`);
    try {

        if (!req.user || !req.user.role) {
            logger.warn('Attempt to create ride without user context');
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        }

        // Verify user is a driver
        if (req.user.role !== 'driver' && req.user.role !== 'both') {
            logger.warn(`User ${req.user.userId} with role ${req.user.role} attempted to create ride`);
            return res.status(403).json({ 
                success: false, 
                message: 'Only drivers can create rides' 
            });
        }

        // Validate request body against schema
        const { error } = createRideSchema.validate(req.body);

        if (error) {
            logger.warn(`Ride creation validation failed: ${error.message}`);
            return res.status(400).json({ 
                success: false, 
                message: error.message 
            });
        }

        const ride = new Ride({
            ...req.body,
            driverId: req.user.userId,
            status: 'available',
            passengers: [],
            createdAt: new Date()
        });

        await ride.save();
        logger.info(`New ride created with ID: ${ride._id}`);
        res.status(201).json({ success: true, data: ride });
    } catch (error) {
        logger.error('Error creating ride:', error);
        res.status(400).json({ success: false, message: 'Failed to create ride' });
    }
};

// Update ride details
export const updateRide = async (req: Request, res: Response) => {
    logger.info(`Updating ride with ID: ${req.params.id}`);
    try {
        const { id } = req.params;
        const ride = await Ride.findById(id);
        
        if (!ride) {
            return res.status(404).json({ success: false, message: 'Ride not found' });
        }

        if (ride.status !== 'available') {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot update ride - already booked or completed' 
            });
        }

        const updatedRide = await Ride.findByIdAndUpdate(
            id,
            { ...req.body, updatedAt: new Date() },
            { new: true }
        );

        logger.info(`Ride ${id} updated successfully`);
        res.status(200).json({ success: true, data: updatedRide });
    } catch (error) {
        logger.error(`Error updating ride:`, error);
        res.status(400).json({ success: false, message: 'Failed to update ride' });
    }
};

// Delete a ride
export const deleteRide = async (req: Request, res: Response) => {
    logger.info(`Deleting ride with ID: ${req.params.id}`);
    try {
        const { id } = req.params;
        const ride = await Ride.findById(id);
        
        if (!ride) {
            return res.status(404).json({ success: false, message: 'Ride not found' });
        }

        if (ride.passengers.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete ride with existing bookings' 
            });
        }

        await Ride.findByIdAndDelete(id);
        logger.info(`Ride ${id} deleted successfully`);
        res.status(200).json({ success: true, message: 'Ride deleted successfully' });
    } catch (error) {
        logger.error(`Error deleting ride:`, error);
        res.status(400).json({ success: false, message: 'Failed to delete ride' });
    }
};

// Get ride by ID
export const getRideById = async (req: Request, res: Response) => {
    logger.info(`Fetching ride details for ID: ${req.params.id}`);
    try {

        const ride = await Ride.findById(req.params.id);
        if (!ride) {
            return res.status(404).json({ success: false, message: 'Ride not found' });
        }
        res.status(200).json({ success: true, data: ride });
    } catch (error) {
        logger.error(`Error fetching ride:`, error);
        res.status(400).json({ success: false, message: 'Failed to fetch ride' });
    }
};

interface BookingRequest {
    seats: number;
}


export const bookRide = async (req: Request, res: Response) => {
    logger.info(`Booking ride request received for user ${req.user?.userId}`);
    // Start a MongoDB session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const { id: rideId } = req.params;
        const { seats }: BookingRequest = req.body;

        // Validate seats requested
        if (!seats || seats < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid number of seats requested'
            });
        }

        // Find and lock the ride document
        const ride = await Ride.findById(rideId).session(session);

        if (!ride) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'Ride not found'
            });
        }

        // Check if ride is available
        if (ride.status !== 'available') {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Ride is not available for booking'
            });
        }

        // Check if user is not booking their own ride
        if (ride.driverId === req.user.userId) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Driver cannot book their own ride'
            });
        }

        // Check if user has already booked this ride
        const existingBooking = ride.passengers.find(p => p.userId === req.user.userId);
        if (existingBooking) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'You have already booked this ride'
            });
        }

        // Check if enough seats are available
        const totalBookedSeats = ride.passengers.reduce((sum, passenger) => sum + passenger.seats, 0);
        const remainingSeats = ride.availableSeats - totalBookedSeats;

        if (seats > remainingSeats) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Only ${remainingSeats} seats available`
            });
        }

          const bookingPayload = {
      rideId,
      passengerId: req.user.userId,
      seats,
      status: 'pending',
      timestamp: new Date(),
    };

      // Publish to RabbitMQ
    const channel = getChannel();
    const queue = 'booking.requested';

     await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(bookingPayload)));

     logger.info(`Booking request sent to queue for ride ${rideId}`);
        // Update ride with new booking using optimistic locking
        // const updatedRide = await Ride.findOneAndUpdate(
        //     {
        //         _id: rideId,
        //         status: 'available',
        //         // Optimistic locking condition
        //         passengers: ride.passengers // Ensures passengers array hasn't changed
        //     },
        //     {
        //         $push: {
        //             passengers: {
        //                 userId: req.user.userId,
        //                 seats: seats,
        //                 bookingTime: new Date()
        //             }
        //         },
        //         // Update status if all seats are now booked
        //         $set: {
        //             status: (totalBookedSeats + seats === ride.availableSeats) ? 'booked' : 'available',
        //             updatedAt: new Date()
        //         }
        //     },
        //     {
        //         new: true,
        //         session,
        //         runValidators: true
        //     }
        // );

        // if (!updatedRide) {
        //     await session.abortTransaction();
        //     return res.status(409).json({
        //         success: false,
        //         message: 'Booking failed due to concurrent update. Please try again.'
        //     });
        // }

        // Commit the transaction
        // await session.commitTransaction();
        // logger.info(`Ride ${rideId} booked successfully by user ${req.user.userId}`);

        res.status(200).json({
            success: true,
            message: 'Booking request sent to driver',
            data: bookingPayload
        });

    } catch (error) {
        await session.abortTransaction();
        logger.error('Error booking ride:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to book ride'
        });
    } finally {
        session.endSession();
    }
};



export const getDriverRequests = async (req: Request, res: Response) => {
  try {
    const driverId = req.user?.userId;

    if (!driverId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Find rides created by this driver
    const driverRides = await Ride.find({ driverId }).select('_id');
    const rideIds = driverRides.map(ride => ride._id);

    // Find pending booking requests for these rides
    const requests = await BookingRequest.find({
      rideId: { $in: rideIds },
      status: 'pending'
    }).sort({ requestedAt: -1 });

    return res.status(200).json({ success: true, data: requests });

  } catch (err) {
    console.error('Error fetching booking requests for driver:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};