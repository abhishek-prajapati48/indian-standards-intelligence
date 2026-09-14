import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { recommend, history } from '../controllers/recommendations.controller.js';

const router = Router();
const recommendationSchema = z.object({
  query: z.string().trim().min(3).max(12000),
  limit: z.coerce.number().int().min(4).max(12).optional()
}).strict();

router.use(authenticate);
router.post('/', validateBody(recommendationSchema), asyncHandler(recommend));
router.post('/generate', validateBody(recommendationSchema), asyncHandler(recommend));
router.get('/', asyncHandler(history));

export default router;
