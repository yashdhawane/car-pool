import User from '../model/User';
import RefreshToken from '../model/Refresh';
import { generateTokens } from '../utils/generatetoken';
import { signupSchema, loginSchema,roleChangeSchema } from '../utils/validation';
import {logger} from '../utils/logger';
import { Request, Response } from 'express';
import Redis from 'ioredis';


export const registerUser = async (req:Request, res:Response): Promise<Response> => {
  logger.info('Registration endpoint hit...');

  try {
    // Validate request body
    const { error } = signupSchema.validate(req.body);
    if (error) {
      logger.warn('Validation error:', error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email, password, name } = req.body;

    // Check if user exists by email or username
    let user = await User.findOne({ $or: [{ email }, { name }] });
    if (user) {
      logger.warn('User already exists');
      return res.status(409).json({
        success: false,
        message: 'User already exists',
      });
    }

    // Create new user, default role is 'passenger' (set in model or here)
    user = new User({ name, email, password /* role defaults in schema */ });
    await user.save();

    logger.info('User registered successfully:', user._id);

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully!',
      accessToken,
      refreshToken,
    });

  } catch (err) {
    logger.error('Registration error occurred:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<Response> => {
  logger.info('Login endpoint hit...');
  
  try {
    // Validate request body
    const { error } = loginSchema.validate(req.body);
    if (error) {
      logger.warn('Validation error:', error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      logger.warn('Invalid user');
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      logger.warn('Invalid password');
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const { accessToken, refreshToken } = await generateTokens(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      userId: user._id,
    });
  } catch (error) {
    logger.error('Login error occurred:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const refreshTokenUser = async (req: Request, res: Response): Promise<Response> => {
  logger.info('Refresh token endpoint hit...');
  const { refreshToken } = req.body;

  if (!refreshToken) {
    logger.warn('Refresh token missing');
    return res.status(400).json({ 
      success: false, 
      message: 'Refresh token missing' 
    });
  }

  try {
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    
    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn('Invalid or expired refresh token');
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired refresh token' 
      });
    }

    const user = await User.findById(storedToken.user);
    if (!user) {
      logger.warn('User not found');
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(user);

    await RefreshToken.deleteOne({ _id: storedToken._id });

    return res.status(200).json({ 
      success: true,
      accessToken, 
      refreshToken: newRefreshToken 
    });

  } catch (error) {
    logger.error('Error refreshing token:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

export const logoutUser = async (req: Request, res: Response): Promise<Response> => {
  logger.info('Logout endpoint hit...');
  const { refreshToken } = req.body;

  if (!refreshToken) {
    logger.warn('Refresh token missing');
    return res.status(400).json({ 
      success: false, 
      message: 'Refresh token missing' 
    });
  }

  try {
    const deleted = await RefreshToken.findOneAndDelete({ token: refreshToken });

    if (!deleted) {
      logger.warn('Invalid refresh token');
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid refresh token' 
      });
    }

    logger.info('User logged out successfully');
    return res.status(200).json({ 
      success: true, 
      message: 'Logged out successfully!' 
    });

  } catch (error) {
    logger.error('Error during logout:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

export const changeuserRole = async (req: Request, res: Response): Promise<Response> => {
   logger.info('Change user role endpoint hit...');
  const userId = (req.user as any)?.userId;

  try {
    // Validate the driver profile data
    const { error } = roleChangeSchema.validate(req.body);
    if (error) {
      logger.warn('Validation error:', error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      logger.warn('User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role !== 'passenger') {
      logger.warn('User already has driver privileges');
      return res.status(400).json({
        success: false,
        message: 'User already has driver privileges'
      });
    }

    // Create driver profile
    const DriverProfile = await import('../model/Driver').then(m => m.default);
    const driverProfile = new DriverProfile({
      user: userId,
      ...req.body.driverProfile
    });

    // Save the driver profile
    await driverProfile.save();

    // Update user role to 'both'
    user.role = 'both';
    await user.save();

    // Get the current access token from the Authorization header
    const authHeader = req.headers.authorization;
    const currentToken = authHeader?.split(' ')[1];

    // Add the current token to Redis blacklist with expiry
    if (currentToken) {
      const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      // Store the token in blacklist with 1 hour expiry (same as token expiry)
      await redisClient.setex(`bl_${currentToken}`, 3600, 'true');
      await redisClient.quit();
    }

    // Generate new tokens with updated role
    const { accessToken, refreshToken } = await generateTokens(user);

    logger.info(`User ${userId} role updated to both and driver profile created`);
    return res.status(200).json({
      success: true,
      message: 'Role updated and driver profile created successfully',
      accessToken,
      refreshToken,
      driverProfile: {
        id: driverProfile._id,
        verified: driverProfile.verified
      }
    });

  } catch (error) {
    logger.error('Error updating user role:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
