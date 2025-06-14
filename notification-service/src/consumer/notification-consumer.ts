import { Channel, connect } from 'amqplib';

import { Redis } from 'ioredis';
import { EmailService } from '../services/email-service';
import { NotificationPayload } from '../types/notificationpayload';
import { logger } from '../utils/logger';

export class NotificationService {
  private channel!: Channel;
  private redis: Redis;
  private emailService: EmailService;

  constructor(emailService: EmailService) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.emailService = emailService;
  }

  async start() {
    try {
      const connection = await connect(process.env.RABBITMQ_URL || 'amqp://localhost');
      this.channel = await connection.createChannel();
      
      await this.channel.assertQueue('notifications.booking', { durable: true });
      
      this.channel.consume('notifications.booking', async (msg) => {
        if (msg) {
          try {
            const notification: NotificationPayload = JSON.parse(msg.content.toString());
            await this.processNotification(notification);
            this.channel.ack(msg);
          } catch (error) {
            logger.error('Error processing notification:', error);
            this.channel.nack(msg, false, true); // Requeue the message
          }
        }
      });

      logger.info('Notification service started successfully');
    } catch (error) {
      logger.error('Failed to start notification service:', error);
      throw error;
    }
  }

  private async processNotification(notification: NotificationPayload) {
    switch (notification.type) {
      case 'BOOKING_ACCEPTED':
        await this.handleAcceptedBooking(notification);
        break;
      case 'BOOKING_REJECTED':
        await this.handleRejectedBooking(notification);
        break;
      case 'RIDE_FULLY_BOOKED':
        await this.handleFullyBookedRide(notification);
        break;
    }
  }

  private async handleAcceptedBooking(notification: NotificationPayload) {
    const otp = this.generateOTP();
    const redisKey = `ride${notification.rideId}passenger${notification.userId}otp`;

    logger.info(`Generating OTP for ride: ${notification.rideId}, passenger: ${notification.userId}`);
    logger.info(`Redis key: ${redisKey}`);

    // Store OTP in Redis with 24 hour expiry
   const result = await this.redis.setex(
  redisKey,
  24 * 60 * 60, // 24 hours in seconds
  otp
);

      if (result !== 'OK') {
            throw new Error(`Failed to store OTP in Redis. Result: ${result}`);
        }

    const storedOTP = await this.redis.get(redisKey);
    logger.info(`OTP stored in Redis: ${storedOTP}`);
    logger.info(`Stored OTP verification: ${storedOTP === otp ? 'Success' : 'Failed'}`);
        
        
    // // Store OTP in Redis with 24 hour expiry
    // await this.redis.set(
    //   `ride:${notification.rideId}:passenger:${notification.userId}:otp`,
    //   otp,
    //   'EX',
    //   24 * 60 * 60
    // );

    await this.emailService.sendEmail(
      notification.email,
      
      'Ride Booking Confirmed',
      `
        <h2>Your ride booking has been confirmed!</h2>
        <p>Ride Details:</p>
        <ul>
          <li>From: ${notification.source}</li>
          <li>To: ${notification.destination}</li>
          <li>Date: ${notification.departureTime}</li>
          <li>Seats: ${notification.seats}</li>
        </ul>
        <p>Your OTP: <strong>${otp}</strong></p>
        <p>Please share this OTP with your driver when you meet.</p>
      `
    );
  }

  private async handleRejectedBooking(notification: NotificationPayload) {
    await this.emailService.sendEmail(
      notification.email,
      'Ride Booking Rejected',
      `
        <h2>Booking Update</h2>
        <p>Unfortunately, your ride booking was not confirmed.</p>
        <p>Please try booking another available ride.</p>
      `
    );
  }

  private async handleFullyBookedRide(notification: NotificationPayload) {
    await this.emailService.sendEmail(
      notification.email,
      'Ride Fully Booked',
      `
        <h2>Ride Update</h2>
        <p>The ride you requested is now fully booked.</p>
        <p>Please try booking another available ride.</p>
      `
    );
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}