import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from '../server/node_modules/mongoose/index.js';
import User from '../server/src/models/User.js';

dotenv.config({ path: new URL('../server/.env', import.meta.url) });

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('MONGODB_URI is required');
}

await mongoose.connect(uri);

const email = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
const password = process.env.SEED_ADMIN_PASSWORD || 'Jnv@2016';

const existing = await User.findOne({ email });

if (existing) {
  console.log(`Admin already exists: ${email}`);
} else {
  await User.create({
    name: 'System Administrator',
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'admin'
  });

  console.log(`Admin created: ${email}`);
  console.log('Change the password after first login.');
}

await mongoose.disconnect();