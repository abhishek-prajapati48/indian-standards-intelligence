import mongoose from 'mongoose';
import Standard from '../models/Standard.js';
import { ok } from '../utils/response.js';
import { semanticVectorSearch } from '../services/vector.service.js';
import { ApiError } from '../utils/ApiError.js';

export async function semanticSearch(req, res) {
  const { query = '', filters = {}, limit = 8 } = req.body || {};
  const cleanQuery = String(query).trim();
  if (!cleanQuery) throw new ApiError(400, 'Search query is required.', 'QUERY_REQUIRED');

  try {
    const chunks = await semanticVectorSearch({ query: cleanQuery, limit, standardId: filters.standardId });
    const standardIds = [...new Set(chunks.map((item) => String(item.standardId || '')).filter(Boolean))]
      .filter((id) => mongoose.isValidObjectId(id));
    const standards = await Standard.find({ _id: { $in: standardIds } })
      .select('standardNumber title description category status verified source relatedStandards normativeReferences');
    const byId = new Map(standards.map((item) => [String(item._id), item]));

    const results = chunks.map((chunk) => {
      const standard = byId.get(String(chunk.standardId));
      return {
        chunkId: chunk._id,
        documentId: chunk.documentId,
        standardId: chunk.standardId,
        standardNumber: standard?.standardNumber || null,
        title: standard?.title || 'Unmapped source document',
        description: standard?.description || null,
        category: standard?.category || null,
        status: standard?.status || null,
        verificationStatus: standard?.verified ? 'verified' : 'unverified',
        score: Number(chunk.score || 0),
        snippet: String(chunk.text || '').slice(0, 900),
        evidence: standard?.source ? [standard.source] : [],
        relatedStandards: standard?.relatedStandards || [],
        normativeReferences: standard?.normativeReferences || []
      };
    });
    return ok(res, { query: cleanQuery, results, mode: 'mongodb-vector-search', notice: 'Semantic results are generated from indexed document chunks. Verified regulatory facts must still be confirmed against authoritative sources.' });
  } catch (error) {
    throw new ApiError(error.code === 'EMBEDDING_NOT_CONFIGURED' ? 503 : 502, error.message, error.code || 'SEMANTIC_SEARCH_FAILED');
  }
}
