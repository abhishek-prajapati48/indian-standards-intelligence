import app from './app.js';
import { connectDB, startDatabaseRetry } from './config/database.js';
import { env } from './config/env.js';

const server = app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
  console.log(`Health check: http://localhost:${env.PORT}/api/health`);
});

const connected = await connectDB();

if (!connected) {
  console.warn('Starting API without MongoDB. Database-backed features will be unavailable until MongoDB connects.');
  startDatabaseRetry();
}

function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down...`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
