import { getChannel } from '../utils/rabbitmq';
import { BookingRequest } from '../model/bookingrequest'; // new model
import { Ride } from '../model/Ride'; // for validation only
import {logger} from '../utils/logger';

export const consumeBookingRequests = async () => {
  const channel = getChannel();
  await channel.assertQueue('booking.requested', { durable: true });

  channel.consume('booking.requested', async (msg) => {
    if (!msg) return;

    try {
      const { rideId, passengerId, seats, timestamp } = JSON.parse(msg.content.toString());

      logger.info(`📩 Received booking request for ride ${rideId} from passenger ${passengerId}`);

      // Validate ride exists
      const ride = await Ride.findById(rideId);
      if (!ride) {
        logger.warn(`❌ Ride not found: ${rideId}`);
        return channel.ack(msg);
      }

      // Prevent duplicate booking request by same user for same ride
      const existingRequest = await BookingRequest.findOne({ rideId, passengerId });
      if (existingRequest) {
        logger.warn(`⚠️ Duplicate booking request by ${passengerId} for ride ${rideId}`);
        return channel.ack(msg);
      }

      // Save booking request in its own collection
      await BookingRequest.create({
        rideId,
        passengerId,
        seats,
        status: 'pending',
        requestedAt: timestamp || new Date(),
      });

      logger.info(`✅ Booking request saved in DB for ride ${rideId}`);
      channel.ack(msg);

    } catch (err) {
      logger.error('🚨 Error handling booking request:', err);
      channel.ack(msg); // OR channel.nack(msg, false, true) if you want retries
    }
  });

  logger.info('📡 Listening to booking.requested queue...');
};
