import mongoose from 'mongoose';
import Document from '../models/Document.js';
import { embedDocument } from '../services/vector.service.js';
import { embeddingConfig } from '../services/embedding.service.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/response.js';

function ensureDatabase() {
  if (mongoose.connection.readyState !== 1) throw new ApiError(503, 'MongoDB is not connected.', 'DATABASE_UNAVAILABLE');
}

export async function status(req, res) {
  ensureDatabase();
  const counts = await Document.aggregate([
    { $group: { _id: '$embeddingStatus', count: { $sum: 1 } } }
  ]);
  return ok(res, { config: embeddingConfig(), counts });
}

export async function indexDocument(req, res) {
  ensureDatabase();
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid document ID', 'INVALID_ID');
  const document = await Document.findById(req.params.id);
  if (!document) throw new ApiError(404, 'Document not found', 'DOCUMENT_NOT_FOUND');
  try {
    const result = await embedDocument(document._id);
    return ok(res, result, 'Document chunks embedded successfully');
  } catch (error) {
    throw new ApiError(502, error.message, error.code || 'EMBEDDING_FAILED');
  }
}

export async function indexPending(req, res) {
  ensureDatabase();
  const limit = Math.min(Math.max(Number.parseInt(req.body?.limit || '10', 10), 1), 50);
  const docs = await Document.find({
    processingStatus: 'completed',
    embeddingStatus: { $in: ['pending', 'failed'] }
  }).sort({ createdAt: 1 }).limit(limit).select('_id originalName');

  const results = [];
  for (const document of docs) {
    try {
      results.push({ ...(await embedDocument(document._id)), status: 'completed', originalName: document.originalName });
    } catch (error) {
      results.push({ documentId: document._id, originalName: document.originalName, status: 'failed', error: error.message });
    }
  }
  return ok(res, { requested: docs.length, results }, 'Pending documents indexed');
}
