import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

async function getSingleUser() {
  const email = (process.env.SUPER_ADMIN_EMAIL || 'admin@shortifyai.local').toLowerCase();
  let user = await User.findOne({ email }).select('-password');

  if (user) return user;

  user = await User.findOne().sort({ createdAt: 1 }).select('-password');
  if (user) return user;

  const created = await User.create({
    name: process.env.SUPER_ADMIN_NAME || 'ShortifyAI Admin',
    email,
    password: process.env.SUPER_ADMIN_PASSWORD || 'Admin@123456',
    role: 'super-admin',
    plan: 'Admin'
  });

  return User.findById(created._id).select('-password');
}

export const protect = asyncHandler(async (req, _res, next) => {
  if (process.env.AUTH_DISABLED === 'true') {
    const user = await getSingleUser();
    req.user = user;
    return next();
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    const error = new Error('Authentication token required');
    error.statusCode = 401;
    throw error;
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select('-password');

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 401;
    throw error;
  }

  req.user = user;
  next();
});
