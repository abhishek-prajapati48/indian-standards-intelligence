import mongoose from 'mongoose';
import { env } from './env.js';

let lastError = null;
let retryTimer = null;

export function getDatabaseStatus() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return {
    state: states[mongoose.connection.readyState] ?? 'unknown',
    connected: mongoose.connection.readyState === 1,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
    lastError: lastError ? lastError.message : null
  };
}

export async function connectDB() {
  if (!env.MONGODB_URI) {
    lastError = new Error('MONGODB_URI is not configured');
    return false;
  }

  if (mongoose.connection.readyState === 1) return true;
  if (mongoose.connection.readyState === 2) return false;

  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
      socketTimeoutMS: 10000,
      maxPoolSize: 10
    });

    lastError = null;
    console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
    return true;
  } catch (error) {
    lastError = error;
    console.error(`MongoDB unavailable: ${error.message}`);
    return false;
  }
}

export function startDatabaseRetry() {
  if (retryTimer) return;

  retryTimer = setInterval(async () => {
    if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) return;
    await connectDB();
  }, 10000);

  retryTimer.unref?.();
}

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. The API remains available while the database is offline.');
});

mongoose.connection.on('error', (error) => {
  lastError = error;
  console.error(`MongoDB connection error: ${error.message}`);
});
