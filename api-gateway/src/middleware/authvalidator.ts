import jwt from 'jsonwebtoken';
import {Request, Response, NextFunction} from 'express';
import {logger} from '@/utils/logger';


interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
  role: string;
}


declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const validateToken = (req:Request, res:Response, next:NextFunction) => {
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

  jwt.verify(token, jwtSecret, (err, decoded:any) => {
    if (err) {
      logger.warn(`Invalid token from IP: ${req.ip} | Error: ${err.message}`);
      return res.status(403).json({
        success: false,
        message: 'Invalid token',
        error: err.message,
      });
    }
    // Validate that the decoded token has all required fields
    if (!decoded.userId || !decoded.email || !decoded.name || !decoded.role) {
      logger.warn(`Incomplete user data in token from IP: ${req.ip}`);
      return res.status(403).json({
        success: false,
        message: 'Invalid token format',
      });
    }

     req.user = {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role
    };

     logger.debug(`Token validated for user: ${req.user.name} (${req.user.userId}) from IP: ${req.ip}`);
    return next();
  });
};
