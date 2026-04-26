import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { publicUser, signToken } from '../services/tokenService.js';

function duplicateEmailError() {
  const error = new Error('Email is already registered.');
  error.statusCode = 409;
  return error;
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 8) {
    const error = new Error('Name, valid email, and 8+ character password are required.');
    error.statusCode = 400;
    throw error;
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw duplicateEmailError();
  }

  try {
    const user = await User.create({ name, email, password });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.email) {
      throw duplicateEmailError();
    }
    throw error;
  }
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || '').toLowerCase() });

  if (!user || !(await user.comparePassword(password || ''))) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  res.json({ token: signToken(user), user: publicUser(user) });
});
