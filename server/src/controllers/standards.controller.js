import mongoose from 'mongoose';
import Standard from '../models/Standard.js';
import AuditLog from '../models/AuditLog.js';
import { ok } from '../utils/response.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex, clampInt } from '../utils/security.js';

function ensureDatabase() {
  if (mongoose.connection.readyState !== 1) {
    throw new ApiError(503, 'MongoDB is not connected. Start the database connection and try again.', 'DATABASE_UNAVAILABLE');
  }
}

const ARRAY_FIELDS = [
  'keywords',
  'certificationRequirements',
  'testingRequirements',
  'safetyRequirements',
  'installationRequirements',
  'normativeReferences',
  'relatedStandards',
  'amendments'
];

const ALLOWED_FIELDS = new Set([
  'standardNumber', 'title', 'description', 'category', 'productCategory', 'keywords',
  'edition', 'publicationDate', 'status', 'amendments', 'supersedes', 'supersededBy',
  'normativeReferences', 'relatedStandards', 'certificationRequirements',
  'testingRequirements', 'safetyRequirements', 'installationRequirements', 'source',
  'verified', 'lastVerifiedAt'
]);

function cleanPayload(body = {}, { partial = false } = {}) {
  const payload = {};
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_FIELDS.has(key)) payload[key] = value;
  }

  if (!partial && !String(payload.title || '').trim()) {
    throw new ApiError(400, 'Title is required', 'VALIDATION_ERROR');
  }

  if (payload.standardNumber !== undefined) payload.standardNumber = String(payload.standardNumber).trim();
  if (payload.title !== undefined) payload.title = String(payload.title).trim();
  if (payload.status !== undefined) payload.status = String(payload.status).trim().toLowerCase();
  if (payload.category !== undefined) payload.category = String(payload.category).trim();
  if (payload.productCategory !== undefined) payload.productCategory = String(payload.productCategory).trim();

  for (const field of ARRAY_FIELDS) {
    if (payload[field] !== undefined && !Array.isArray(payload[field])) {
      throw new ApiError(400, `${field} must be an array`, 'VALIDATION_ERROR');
    }
  }

  if (payload.publicationDate && Number.isNaN(new Date(payload.publicationDate).getTime())) {
    throw new ApiError(400, 'publicationDate must be a valid date', 'VALIDATION_ERROR');
  }
  if (payload.lastVerifiedAt && Number.isNaN(new Date(payload.lastVerifiedAt).getTime())) {
    throw new ApiError(400, 'lastVerifiedAt must be a valid date', 'VALIDATION_ERROR');
  }

  return payload;
}

async function audit(req, action, resourceId, metadata = {}) {
  try {
    await AuditLog.create({
      userId: req.user?.id,
      action,
      resource: 'Standard',
      resourceId: String(resourceId),
      metadata,
      ip: req.ip
    });
  } catch {
    // Auditing must not make a successful standards operation fail.
  }
}

export async function list(req, res) {
  ensureDatabase();
  const page = clampInt(req.query.page, 1, 1, 100000);
  const limit = clampInt(req.query.limit, 20, 1, 100);
  const skip = (page - 1) * limit;
  const filter = {};
  const q = String(req.query.q || '').trim().slice(0, 200);

  if (req.query.category) filter.category = req.query.category;
  if (req.query.productCategory) filter.productCategory = req.query.productCategory;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.verified !== undefined) filter.verified = req.query.verified === 'true';

  if (q) {
    filter.$or = [
      { standardNumber: { $regex: escapeRegex(q), $options: 'i' } },
      { title: { $regex: escapeRegex(q), $options: 'i' } },
      { description: { $regex: escapeRegex(q), $options: 'i' } },
      { keywords: { $regex: escapeRegex(q), $options: 'i' } }
    ];
  }

  const [items, total] = await Promise.all([
    Standard.find(filter)
      .populate('normativeReferences', 'standardNumber title edition status verified')
      .populate('supersedes', 'standardNumber title edition status')
      .populate('supersededBy', 'standardNumber title edition status')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    Standard.countDocuments(filter)
  ]);

  return ok(res, {
    items,
    pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) }
  });
}

export async function get(req, res) {
  ensureDatabase();
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new ApiError(400, 'Invalid standard ID', 'INVALID_ID');
  }

  const standard = await Standard.findById(req.params.id)
    .populate('normativeReferences', 'standardNumber title edition status verified')
    .populate('supersedes', 'standardNumber title edition status')
    .populate('supersededBy', 'standardNumber title edition status');

  if (!standard) throw new ApiError(404, 'Standard not found', 'STANDARD_NOT_FOUND');
  return ok(res, { standard });
}

export async function create(req, res) {
  ensureDatabase();
  const payload = cleanPayload(req.body);
  if (payload.verified === true && !payload.lastVerifiedAt) payload.lastVerifiedAt = new Date();
  payload.createdBy = req.user.id;
  payload.updatedBy = req.user.id;

  try {
    const standard = await Standard.create(payload);
    await audit(req, 'CREATE', standard._id, { standardNumber: standard.standardNumber, title: standard.title });
    return ok(res, { standard }, 'Standard created', 201);
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'A standard with this standard number and edition already exists', 'STANDARD_EXISTS');
    }
    throw error;
  }
}

export async function update(req, res) {
  ensureDatabase();
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new ApiError(400, 'Invalid standard ID', 'INVALID_ID');
  }

  const payload = cleanPayload(req.body, { partial: true });
  payload.updatedBy = req.user.id;
  if (payload.verified === true && payload.lastVerifiedAt === undefined) payload.lastVerifiedAt = new Date();
  if (payload.verified === false && payload.lastVerifiedAt === undefined) payload.lastVerifiedAt = null;

  try {
    const standard = await Standard.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    });
    if (!standard) throw new ApiError(404, 'Standard not found', 'STANDARD_NOT_FOUND');
    await audit(req, 'UPDATE', standard._id, { changedFields: Object.keys(payload) });
    return ok(res, { standard }, 'Standard updated');
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, 'A standard with this standard number and edition already exists', 'STANDARD_EXISTS');
    }
    throw error;
  }
}

export async function remove(req, res) {
  ensureDatabase();
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new ApiError(400, 'Invalid standard ID', 'INVALID_ID');
  }

  const standard = await Standard.findByIdAndDelete(req.params.id);
  if (!standard) throw new ApiError(404, 'Standard not found', 'STANDARD_NOT_FOUND');
  await audit(req, 'DELETE', standard._id, { standardNumber: standard.standardNumber, title: standard.title });
  return ok(res, { deletedId: standard._id }, 'Standard deleted');
}
