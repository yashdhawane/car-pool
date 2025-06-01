import express, { NextFunction,Request,Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import Redis from 'ioredis';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { RedisStore,RedisReply } from 'rate-limit-redis';
import Authrouter from './routes/identity-route';
import dotenv from 'dotenv';
dotenv.config();

import {logger} from './utils/logger';
import {errorHandler} from './middleware/errorhandler';


const app = express();
const PORT = process.env.PORT || 3001;

const mongo_url = process.env.MONGO_URI || 'mongodb://localhost:27017/identity-service';
mongoose.connect(mongo_url)
  .then(() => {
    logger.info('MongoDB connected');
  })
  .catch((err) => {
    logger.error('MongoDB connection error', err);
    process.exit(1);
  });

const redisurl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = new Redis(redisurl);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body: ${JSON.stringify(req.body)}`);
  next();
});

// DDOS protection and general rate limiting
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'middleware',
  points: 10,
  duration: 1,
});

app.use((req: Request, res: Response, next: NextFunction) => {
  if (!req.ip) {
    logger.warn('No IP address found in request');
    res.status(400).json({ success: false, message: 'Invalid request' });
    return;
  }

  rateLimiter.consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({ success: false, message: 'Too many requests' });
    });
});

// Sensitive endpoints rate limiter
const sensitiveEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ success: false, message: 'Too many requests' });
  },
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as Promise<RedisReply>,
})
});

app.use('/api/auth/register', sensitiveEndpointsLimiter);

// Routes
app.use("/api/auth", Authrouter);

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Identity service running on port ${PORT}`);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
