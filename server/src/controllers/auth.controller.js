import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { ok } from '../utils/response.js';
import { ApiError } from '../utils/ApiError.js';

const PUBLIC_ROLES = new Set(['viewer', 'supplier', 'procurement_officer']);

function sanitizeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive
  };
}

function createToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

export async function register(req, res) {
  const { name, email, password, role = 'viewer' } = req.body ?? {};

  if (typeof name !== 'string' || name.trim().length < 2) {
    throw new ApiError(400, 'Name must contain at least 2 characters', 'VALIDATION_ERROR');
  }
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new ApiError(400, 'A valid email is required', 'VALIDATION_ERROR');
  }
  if (typeof password !== 'string' || password.length < 8) {
    throw new ApiError(400, 'Password must contain at least 8 characters', 'VALIDATION_ERROR');
  }
  if (!PUBLIC_ROLES.has(role)) {
    throw new ApiError(400, 'Invalid registration role', 'INVALID_ROLE');
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (await User.exists({ email: normalizedEmail })) {
    throw new ApiError(409, 'Email already registered', 'EMAIL_EXISTS');
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: await bcrypt.hash(password, 12),
    role
  });

  return ok(res, { user: sanitizeUser(user), token: createToken(user) }, 'Registration successful', 201);
}

export async function login(req, res) {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new ApiError(400, 'Email and password are required', 'VALIDATION_ERROR');
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new ApiError(401, 'Invalid email or password', 'INVALID_AUTH');
  }

  user.lastLoginAt = new Date();
  await user.save();

  return ok(res, { user: sanitizeUser(user), token: createToken(user) }, 'Login successful');
}

export async function me(req, res) {
  const user = await User.findById(req.user.id).select('-passwordHash');
  if (!user || !user.isActive) {
    throw new ApiError(401, 'User account is unavailable', 'INVALID_AUTH');
  }
  return ok(res, { user: sanitizeUser(user) });
}

export function logout(req, res) {
  return ok(res, null, 'Logout successful');
}
