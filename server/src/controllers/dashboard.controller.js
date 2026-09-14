import mongoose from 'mongoose';
import Standard from '../models/Standard.js';
import Document from '../models/Document.js';
import Recommendation from '../models/Recommendation.js';
import Tender from '../models/Tender.js';
import AuditLog from '../models/AuditLog.js';
import { ok } from '../utils/response.js';
import { ApiError } from '../utils/ApiError.js';

function db() {
  if (mongoose.connection.readyState !== 1) {
    throw new ApiError(503, 'MongoDB is not connected.', 'DATABASE_UNAVAILABLE');
  }
}

export async function summary(req, res) {
  db();
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';
  const tenderScope = isAdmin ? {} : { uploadedBy: userId };
  const recommendationScope = isAdmin ? {} : { userId };

  const [
    totalStandards, verifiedStandards, activeStandards,
    totalDocuments, processedDocuments, embeddedDocuments,
    totalRecommendations, totalTenders, validatedTenders,
    highRiskTenders, riskDistribution, categories,
    recentDocuments, recentTenders, recentRecommendations, recentActivity
  ] = await Promise.all([
    Standard.countDocuments(),
    Standard.countDocuments({ verified: true }),
    Standard.countDocuments({ status: 'active' }),
    Document.countDocuments(),
    Document.countDocuments({ status: 'processed' }),
    Document.countDocuments({ embeddingStatus: 'completed' }),
    Recommendation.countDocuments(recommendationScope),
    Tender.countDocuments(tenderScope),
    Tender.countDocuments({ ...tenderScope, validationStatus: 'validated' }),
    Tender.countDocuments({ ...tenderScope, validationStatus: { $in: ['high_risk', 'failed'] } }),
    Tender.aggregate([
      { $match: tenderScope },
      { $group: { _id: '$validationStatus', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Standard.aggregate([
      { $match: { category: { $nin: [null, ''] } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]),
    Document.find().select('originalName status embeddingStatus chunkCount embeddedChunkCount createdAt').sort({ createdAt: -1 }).limit(5).lean(),
    Tender.find(tenderScope).select('title validationStatus validatedAt createdAt report.riskSummary').sort({ createdAt: -1 }).limit(5).lean(),
    Recommendation.find(recommendationScope).select('query language verificationStatus createdAt score').sort({ createdAt: -1 }).limit(5).lean(),
    AuditLog.find(isAdmin ? {} : { userId })
      .select('action resource resourceId metadata createdAt userId')
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 }).limit(10).lean()
  ]);

  return ok(res, {
    generatedAt: new Date(),
    role: req.user.role,
    metrics: {
      standards: { total: totalStandards, verified: verifiedStandards, active: activeStandards, unverified: totalStandards - verifiedStandards },
      documents: { total: totalDocuments, processed: processedDocuments, embedded: embeddedDocuments, pending: totalDocuments - processedDocuments },
      recommendations: { total: totalRecommendations },
      tenders: { total: totalTenders, validated: validatedTenders, highRisk: highRiskTenders }
    },
    riskDistribution: riskDistribution.map((x) => ({ status: x._id || 'unknown', count: x.count })),
    categories: categories.map((x) => ({ category: x._id, count: x.count })),
    recent: { documents: recentDocuments, tenders: recentTenders, recommendations: recentRecommendations, activity: recentActivity }
  });
}
