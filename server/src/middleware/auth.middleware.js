import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';

export async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required', errorCode: 'UNAUTHORIZED' });
  }

  const token = header.slice(7).trim();
  if (!token || token.length > 4096) {
    return res.status(401).json({ success: false, message: 'Invalid authentication token', errorCode: 'INVALID_AUTH' });
  }

  try {
    const claims = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    const user = await User.findById(claims.id).select('_id name email role isActive');

    // Read current account state so deactivation/role changes take effect immediately,
    // rather than waiting for an old JWT to expire.
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User account is unavailable', errorCode: 'ACCOUNT_UNAVAILABLE' });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    };
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token', errorCode: 'INVALID_AUTH' });
  }
}
