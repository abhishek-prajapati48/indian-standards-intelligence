import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import Document from '../models/Document.js';
import Standard from '../models/Standard.js';
import StandardChunk from '../models/StandardChunk.js';
import AuditLog from '../models/AuditLog.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/response.js';
import { processDocument } from '../services/document.service.js';
import { embedDocument } from '../services/vector.service.js';
import { escapeRegex, clampInt } from '../utils/security.js';
import { deleteFile, storagePathFor, storageProvider, uploadFile } from '../services/storage.service.js';

function ensureDatabase() {
  if (mongoose.connection.readyState !== 1) throw new ApiError(503, 'MongoDB is not connected.', 'DATABASE_UNAVAILABLE');
}

async function audit(req, action, resourceId, metadata = {}) {
  try { await AuditLog.create({ userId: req.user?.id, action, resource: 'Document', resourceId: String(resourceId), metadata, ip: req.ip }); } catch {}
}

export async function list(req, res) {
  ensureDatabase();
  const page = clampInt(req.query.page, 1, 1, 100000);
  const limit = clampInt(req.query.limit, 20, 1, 100);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.documentType) filter.documentType = req.query.documentType;
  if (req.query.standardId) filter.standardId = req.query.standardId;
  if (req.query.q) filter.originalName = { $regex: escapeRegex(String(req.query.q).trim().slice(0, 200)), $options: 'i' };
  const [items, total] = await Promise.all([
    Document.find(filter).select('-extractedText').populate('uploadedBy', 'name email role').populate('standardId', 'standardNumber title').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Document.countDocuments(filter)
  ]);
  return ok(res, { items, pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) } });
}

export async function get(req, res) {
  ensureDatabase();
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid document ID', 'INVALID_ID');
  const document = await Document.findById(req.params.id).populate('uploadedBy', 'name email role').populate('standardId', 'standardNumber title');
  if (!document) throw new ApiError(404, 'Document not found', 'DOCUMENT_NOT_FOUND');
  const chunks = await StandardChunk.find({ documentId: document._id }).sort({ chunkIndex: 1 }).select('text chunkIndex metadata');
  return ok(res, { document, chunks });
}

export async function upload(req, res) {
  ensureDatabase();
  if (!req.file) throw new ApiError(400, 'A document file is required', 'FILE_REQUIRED');
  if (req.file.originalname.length > 255) {
    await fs.unlink(req.file.path).catch(() => {});
    throw new ApiError(400, 'File name is too long.', 'INVALID_FILE_NAME');
  }

  // Validate PDF magic bytes after Multer writes the file. Extension/MIME alone can be spoofed.
  if (req.file.mimetype === 'application/pdf' || path.extname(req.file.originalname).toLowerCase() === '.pdf') {
    const handle = await fs.open(req.file.path, 'r');
    try {
      const buffer = Buffer.alloc(5);
      await handle.read(buffer, 0, 5, 0);
      if (buffer.toString('ascii') !== '%PDF-') {
        await fs.unlink(req.file.path).catch(() => {});
        throw new ApiError(400, 'The uploaded file is not a valid PDF.', 'INVALID_FILE_CONTENT');
      }
    } finally {
      await handle.close();
    }
  }

  const documentType = String(req.body.documentType || 'other').trim().toLowerCase();
  if (!['standard', 'tender', 'guidance', 'other'].includes(documentType)) {
    await fs.unlink(req.file.path).catch(() => {});
    throw new ApiError(400, 'Invalid document type. Choose standard, tender, guidance, or other.', 'INVALID_DOCUMENT_TYPE');
  }

  let standardId = null;
  if (req.body.standardId) {
    if (!mongoose.isValidObjectId(req.body.standardId)) throw new ApiError(400, 'Invalid standard ID', 'INVALID_STANDARD_ID');
    const standard = await Standard.exists({ _id: req.body.standardId });
    if (!standard) throw new ApiError(404, 'Linked standard not found', 'STANDARD_NOT_FOUND');
    standardId = req.body.standardId;
  }

  const storagePath = storagePathFor(req.file.filename);
  try {
    await uploadFile(req.file.path, storagePath, req.file.mimetype || 'application/octet-stream');
  } catch (error) {
    await fs.unlink(req.file.path).catch(() => {});
    throw new ApiError(502, 'Document storage upload failed.', 'STORAGE_UPLOAD_FAILED');
  }

  if (storageProvider() === 'supabase') {
    await fs.unlink(req.file.path).catch(() => {});
  }

  const document = await Document.create({
    filename: req.file.filename,
    storageProvider: storageProvider(),
    storagePath: storageProvider() === 'supabase' ? storagePath : req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype || 'application/octet-stream',
    fileSize: req.file.size,
    uploadedBy: req.user.id,
    documentType,
    standardId,
    metadata: { uploadSource: 'web', uploadedAt: new Date().toISOString(), storage: storageProvider() }
  });

  await audit(req, 'CREATE', document._id, { originalName: document.originalName, standardId });
  processDocument(document._id).then(() => embedDocument(document._id)).catch(() => {});
  return ok(res, { document }, 'Document uploaded and processing started', 201);
}

export async function reprocess(req, res) {
  ensureDatabase();
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid document ID', 'INVALID_ID');
  const document = await Document.findById(req.params.id);
  if (!document) throw new ApiError(404, 'Document not found', 'DOCUMENT_NOT_FOUND');
  processDocument(document._id).then(() => embedDocument(document._id)).catch(() => {});
  await audit(req, 'REPROCESS', document._id, { originalName: document.originalName });
  return ok(res, { documentId: document._id }, 'Document reprocessing started');
}

export async function remove(req, res) {
  ensureDatabase();
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid document ID', 'INVALID_ID');
  const document = await Document.findByIdAndDelete(req.params.id);
  if (!document) throw new ApiError(404, 'Document not found', 'DOCUMENT_NOT_FOUND');
  await StandardChunk.deleteMany({ documentId: document._id });
  await deleteFile(document.storagePath || document.filename).catch(() => {});
  await audit(req, 'DELETE', document._id, { originalName: document.originalName });
  return ok(res, { deletedId: document._id }, 'Document deleted');
}
