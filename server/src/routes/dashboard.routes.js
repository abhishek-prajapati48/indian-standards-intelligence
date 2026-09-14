import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { summary } from '../controllers/dashboard.controller.js';

const router = Router();
router.use(authenticate);
router.get('/summary', asyncHandler(summary));
export default router;
