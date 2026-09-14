import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { validate, list, get, revalidate } from '../controllers/tenders.controller.js';

const router = Router();
const tenderSchema = z.object({
  documentId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  title: z.string().trim().max(255).optional(),
  text: z.string().trim().min(1).max(150000).optional()
}).strict().refine(data => Boolean(data.documentId || data.text), { message: 'documentId or text is required' });

router.use(authenticate);
router.get('/', asyncHandler(list));
router.get('/:id', asyncHandler(get));
router.post('/validate', requireRole('admin', 'procurement_officer'), validateBody(tenderSchema), asyncHandler(validate));
router.post('/:id/revalidate', requireRole('admin', 'procurement_officer'), asyncHandler(revalidate));

export default router;
