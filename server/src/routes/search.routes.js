import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { semanticSearch } from '../controllers/search.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(authenticate);
router.post('/', asyncHandler(semanticSearch));
router.post('/semantic', asyncHandler(semanticSearch));
export default router;
