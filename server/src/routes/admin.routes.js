import { Router } from 'express';
import mongoose from 'mongoose';
import Standard from '../models/Standard.js';
import Document from '../models/Document.js';
import Recommendation from '../models/Recommendation.js';
import Tender from '../models/Tender.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { ApiError } from '../utils/ApiError.js';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.middleware.js';
import { escapeRegex, clampInt } from '../utils/security.js';

const router = Router();
const userUpdateSchema = z.object({
  role: z.enum(['admin', 'procurement_officer', 'supplier', 'viewer']).optional(),
  isActive: z.boolean().optional()
}).strict().refine(data => data.role !== undefined || data.isActive !== undefined, { message: 'At least one user change is required' });
router.use(authenticate, requireRole('admin'));

function validId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

router.get('/stats', asyncHandler(async (req, res) => {
  const [total, verified, active, categories] = await Promise.all([
    Standard.countDocuments(),
    Standard.countDocuments({ verified: true }),
    Standard.countDocuments({ status: 'active' }),
    Standard.aggregate([
      { $match: { category: { $nin: [null, ''] } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ])
  ]);
  return ok(res, { stats: { total, verified, active, unverified: total - verified, categories } });
}));

router.get('/analytics', asyncHandler(async (req, res) => {
  const [
    usersByRole,
    userActivity,
    documentsByStatus,
    embeddingHealth,
    tenderStatuses,
    riskLevels,
    recommendationVerification,
    standardsStatus,
    monthlyTenders,
    monthlyRecommendations,
    auditActions
  ] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    User.aggregate([{ $group: { _id: '$isActive', count: { $sum: 1 } } }]),
    Document.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Document.aggregate([{ $group: { _id: '$embeddingStatus', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Tender.aggregate([{ $group: { _id: '$validationStatus', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Tender.aggregate([{ $unwind: { path: '$riskFlags', preserveNullAndEmptyArrays: false } }, { $group: { _id: '$riskFlags.level', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Recommendation.aggregate([{ $group: { _id: '$verificationStatus', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Standard.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Tender.aggregate([
      { $match: { createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1) } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]),
    Recommendation.aggregate([
      { $match: { createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1) } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]),
    AuditLog.aggregate([{ $group: { _id: '$action', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 12 }])
  ]);

  return ok(res, {
    generatedAt: new Date(),
    users: {
      byRole: usersByRole.map(x => ({ role: x._id || 'unknown', count: x.count })),
      active: userActivity.filter(x => x._id === true).reduce((n, x) => n + x.count, 0),
      inactive: userActivity.filter(x => x._id === false).reduce((n, x) => n + x.count, 0)
    },
    documents: {
      byStatus: documentsByStatus.map(x => ({ status: x._id || 'unknown', count: x.count })),
      embeddings: embeddingHealth.map(x => ({ status: x._id || 'unknown', count: x.count }))
    },
    tenders: {
      byStatus: tenderStatuses.map(x => ({ status: x._id || 'unknown', count: x.count })),
      riskLevels: riskLevels.map(x => ({ level: x._id || 'unknown', count: x.count })),
      monthly: monthlyTenders.map(x => ({ year: x._id.year, month: x._id.month, count: x.count }))
    },
    recommendations: {
      verification: recommendationVerification.map(x => ({ status: x._id || 'unknown', count: x.count })),
      monthly: monthlyRecommendations.map(x => ({ year: x._id.year, month: x._id.month, count: x.count }))
    },
    standards: { byStatus: standardsStatus.map(x => ({ status: x._id || 'unknown', count: x.count })) },
    auditActions: auditActions.map(x => ({ action: x._id || 'unknown', count: x.count }))
  });
}));

router.get('/users', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 200);
  const role = String(req.query.role || '').trim();
  const active = String(req.query.active || '').trim();
  const filter = {};
  if (role && ['admin', 'procurement_officer', 'supplier', 'viewer'].includes(role)) filter.role = role;
  if (active === 'true' || active === 'false') filter.isActive = active === 'true';
  if (q) { const safeQ = escapeRegex(q); filter.$or = [{ name: { $regex: safeQ, $options: 'i' } }, { email: { $regex: safeQ, $options: 'i' } }]; }
  const users = await User.find(filter).select('_id name email role isActive lastLoginAt createdAt updatedAt').sort({ createdAt: -1 }).limit(200).lean();
  return ok(res, { items: users });
}));

router.patch('/users/:id', validateBody(userUpdateSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!validId(id)) throw new ApiError(400, 'Invalid user id.', 'INVALID_USER_ID');
  if (String(req.user.id) === String(id) && req.body?.isActive === false) {
    throw new ApiError(400, 'You cannot deactivate your own admin account.', 'SELF_DEACTIVATION_BLOCKED');
  }
  const update = {};
  if (typeof req.body?.isActive === 'boolean') update.isActive = req.body.isActive;
  if (['admin', 'procurement_officer', 'supplier', 'viewer'].includes(req.body?.role)) update.role = req.body.role;
  if (!Object.keys(update).length) throw new ApiError(400, 'No valid user changes supplied.', 'NO_CHANGES');
  const target = await User.findByIdAndUpdate(id, update, { new: true, runValidators: true }).select('_id name email role isActive lastLoginAt createdAt');
  if (!target) throw new ApiError(404, 'User not found.', 'USER_NOT_FOUND');
  await AuditLog.create({ userId: req.user.id, action: 'ADMIN_USER_UPDATE', resource: 'User', resourceId: String(target._id), metadata: update, ip: req.ip });
  return ok(res, { user: target });
}));

router.get('/audit-logs', asyncHandler(async (req, res) => {
  const limit = clampInt(req.query.limit, 50, 1, 100);
  const action = String(req.query.action || '').trim();
  const resource = String(req.query.resource || '').trim();
  const filter = {};
  if (action) filter.action = action;
  if (resource) filter.resource = resource;
  const logs = await AuditLog.find(filter)
    .populate('userId', 'name email role')
    .sort({ createdAt: -1 })
    .limit(limit);
  return ok(res, { items: logs });
}));

export default router;
