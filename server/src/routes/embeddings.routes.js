import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { status, indexDocument, indexPending } from '../controllers/embeddings.controller.js';

const router = Router();
router.use(authenticate);
router.get('/status', requireRole('admin', 'procurement_officer'), asyncHandler(status));
router.post('/documents/:id', requireRole('admin', 'procurement_officer'), asyncHandler(indexDocument));
router.post('/pending', requireRole('admin', 'procurement_officer'), asyncHandler(indexPending));
export default router;
