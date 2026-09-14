import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';
import { uploadLimiter } from '../middleware/rateLimit.middleware.js';
import { list, get, upload, reprocess, remove } from '../controllers/documents.controller.js';

fs.mkdirSync(path.resolve(env.UPLOAD_DIR), { recursive: true });
const allowed = new Set(['application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'application/json', 'application/xml', 'text/xml']);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.resolve(env.UPLOAD_DIR)),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
});
const uploadMiddleware = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => cb(null, allowed.has(file.mimetype) || ['.pdf', '.txt', '.md', '.csv', '.json', '.xml'].includes(path.extname(file.originalname).toLowerCase()))
});

const router = Router();
router.use(authenticate);
router.get('/', asyncHandler(list));
router.get('/:id', asyncHandler(get));
router.post('/', requireRole('admin', 'procurement_officer'), uploadLimiter, uploadMiddleware.single('file'), asyncHandler(upload));
router.post('/:id/reprocess', requireRole('admin', 'procurement_officer'), asyncHandler(reprocess));
router.delete('/:id', requireRole('admin'), asyncHandler(remove));

export default router;
