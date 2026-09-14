import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/response.js';
import { generateRecommendation, recommendationHistory } from '../services/rag.service.js';

export async function recommend(req, res) {
  if (mongoose.connection.readyState !== 1) throw new ApiError(503, 'MongoDB is not connected.', 'DATABASE_UNAVAILABLE');
  try {
    const data = await generateRecommendation({ userId: req.user.id || req.user.userId, query: req.body?.query, limit: req.body?.limit });
    return ok(res, data, 'Recommendation generated');
  } catch (error) {
    const status = ['QUERY_REQUIRED', 'LLM_NOT_CONFIGURED'].includes(error.code) ? (error.code === 'QUERY_REQUIRED' ? 400 : 503) : 502;
    throw new ApiError(status, error.message, error.code || 'RECOMMENDATION_FAILED');
  }
}

export async function history(req, res) {
  if (mongoose.connection.readyState !== 1) throw new ApiError(503, 'MongoDB is not connected.', 'DATABASE_UNAVAILABLE');
  const userId = req.user.id || req.user.userId;
  return ok(res, { recommendations: await recommendationHistory(userId, req.query?.limit) });
}
