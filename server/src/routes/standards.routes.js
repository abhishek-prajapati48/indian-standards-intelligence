import { Router } from 'express';
import { list, get, create, update, remove } from '../controllers/standards.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(list));
router.get('/:id', asyncHandler(get));
router.post('/', authenticate, requireRole('admin'), asyncHandler(create));
router.put('/:id', authenticate, requireRole('admin'), asyncHandler(update));
router.delete('/:id', authenticate, requireRole('admin'), asyncHandler(remove));

export default router;
