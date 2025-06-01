import jwt from 'jsonwebtoken';
import {Request, Response, NextFunction} from 'express';
import {logger} from '../utils/logger';
import Redis from 'ioredis';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const validateToken = async (req:Request, res:Response, next:NextFunction)  => {
  const authheader = req.headers['authorization'];

  if (!authheader || !authheader.startsWith('Bearer ')) {
    logger.warn(`Unauthorized access attempt without Bearer token from IP: ${req.ip}`);
    return res.status(401).json({
      success: false,
      message: 'Authentication required! Please login to continue',
    });
  }

  const token = authheader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    logger.error('JWT_SECRET is not defined in environment variables');
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }

  try {
    // Check if token is blacklisted
    const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    const isBlacklisted = await redisClient.get(`bl_${token}`);
    await redisClient.quit();

    if (isBlacklisted) {
      logger.warn(`Blacklisted token used from IP: ${req.ip}`);
      return res.status(401).json({
        success: false,
        message: 'Token is no longer valid',
      });
    }

    // Verify token
    jwt.verify(token, jwtSecret, (err, user:any) => {
      if (err) {
        logger.warn(`Invalid token from IP: ${req.ip} | Error: ${err.message}`);
        return res.status(403).json({
          success: false,
          message: 'Invalid token',
          error: err.message,
        });
      }

      req.user = user;
      logger.debug(`Token validated for user: ${user?.userId || 'unknown'} from IP: ${req.ip}`);
      return next();
    });
  } catch (error) {
    logger.error('Error validating token:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
