import dotenv from 'dotenv';
import { EmailService } from './services/email-service';
import { NotificationService } from './consumer/notification-consumer';
import { logger } from './utils/logger';

dotenv.config();

async function startService() {
  try {
    const emailService = new EmailService({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || 'email@gmail.com',
        pass: process.env.SMTP_PASS || 'password',
      },
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      },
      
    });

    const notificationService = new NotificationService(emailService);
    await notificationService.start();
    
    logger.info('🔔 Notification service is running');
  } catch (error) {
    logger.error('Failed to start notification service:', error);
    process.exit(1);
  }
}

startService();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});