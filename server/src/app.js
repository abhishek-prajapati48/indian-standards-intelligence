import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { apiLimiter } from './middleware/rateLimit.middleware.js';
import { env } from './config/env.js';
import { getDatabaseStatus } from './config/database.js';
import auth from './routes/auth.routes.js';
import standards from './routes/standards.routes.js';
import search from './routes/search.routes.js';
import placeholder from './routes/placeholder.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { requestId } from './middleware/requestId.middleware.js';
import protectedRoutes from './routes/protected.routes.js';
import adminRoutes from './routes/admin.routes.js';
import documentsRoutes from './routes/documents.routes.js';
import embeddingsRoutes from './routes/embeddings.routes.js';
import recommendationsRoutes from './routes/recommendations.routes.js';
import tendersRoutes from './routes/tenders.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(requestId);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.CLIENT_URL, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'] }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
  const database = getDatabaseStatus();

  res.status(200).json({
    success: true,
    message: 'Standards Intelligence API is running',
    server: 'running',
    database
  });
});

app.use('/api/auth', auth);
app.use('/api/protected', protectedRoutes);
app.use('/api/standards', standards);
app.use('/api/search', search);
app.use('/api/documents', documentsRoutes);
app.use('/api/embeddings', embeddingsRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/tenders', tendersRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', placeholder);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
