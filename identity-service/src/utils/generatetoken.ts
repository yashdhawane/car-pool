import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import RefreshToken from '../model/Refresh';

export const generateTokens = async (user:any) => {
  const accessToken = jwt.sign(
    {
      userId: user._id,
      username: user.username,
      role: user.role, // optional: include role if needed
    },
    process.env.JWT_SECRET || 'default_secret_key',
    { expiresIn: '60m' }
  );

  const refreshToken = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await RefreshToken.create({
    token: refreshToken,
    user: user._id,
    expiresAt,
  });

  return { accessToken, refreshToken };
};
