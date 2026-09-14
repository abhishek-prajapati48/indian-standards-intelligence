import mongoose from 'mongoose';
import Standard from '../models/Standard.js';
import Document from '../models/Document.js';
import Recommendation from '../models/Recommendation.js';
import { semanticVectorSearch } from './vector.service.js';
import { generateStructured, llmConfig } from './llm.service.js';

function detectLanguage(text) {
  return /[\u0900-\u097F]/.test(text) ? 'hi' : 'en';
}

function compactEvidence(chunks, standards, documents) {
  const standardsById = new Map(standards.map((s) => [String(s._id), s]));
  const docsById = new Map(documents.map((d) => [String(d._id), d]));
  return chunks.map((chunk, index) => {
    const standard = standardsById.get(String(chunk.standardId));
    const document = docsById.get(String(chunk.documentId));
    return {
      evidenceId: `E${index + 1}`,
      chunkId: String(chunk._id),
      documentId: chunk.documentId ? String(chunk.documentId) : null,
      documentName: document?.originalName || 'Source document',
      standardId: standard ? String(standard._id) : null,
      standardNumber: standard?.standardNumber || null,
      title: standard?.title || 'Source document',
      verified: Boolean(standard?.verified),
      source: standard?.source || null,
      score: Number(chunk.score || 0),
      chunkIndex: chunk.chunkIndex,
      text: String(chunk.text || '').slice(0, 1800)
    };
  });
}

function fallbackAnswer(query, evidence) {
  if (!evidence.length) return 'Insufficient verified data to answer this query from the indexed knowledge base.';
  return `The indexed documents contain relevant evidence for “${query}”. Review the cited evidence below; regulatory status and applicability should be confirmed against authoritative sources.`;
}

export async function generateRecommendation({ userId, query, limit = 8 }) {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) throw Object.assign(new Error('Query is required.'), { code: 'QUERY_REQUIRED' });

  const chunks = await semanticVectorSearch({ query: cleanQuery, limit: Math.min(Math.max(Number(limit) || 8, 4), 12) });
  const standardIds = [...new Set(chunks.map((c) => String(c.standardId || '')).filter((id) => mongoose.isValidObjectId(id)))];
  const documentIds = [...new Set(chunks.map((c) => String(c.documentId || '')).filter((id) => mongoose.isValidObjectId(id)))];
  const [standards, documents] = await Promise.all([
    standardIds.length ? Standard.find({ _id: { $in: standardIds } }).select('standardNumber title description category status verified source relatedStandards normativeReferences') : [],
    documentIds.length ? Document.find({ _id: { $in: documentIds } }).select('originalName source standardId') : []
  ]);

  const evidence = compactEvidence(chunks, standards, documents);
  const context = evidence.map((e) => `[${e.evidenceId}] Standard: ${e.standardNumber || 'unmapped'} | Title: ${e.title} | Verified metadata: ${e.verified ? 'yes' : 'no'} | Similarity: ${(e.score * 100).toFixed(1)}%\n${e.text}`).join('\n\n');
  const language = detectLanguage(cleanQuery);
  const prompt = `You are the Standards Intelligence recommendation engine. Answer only from the supplied evidence. Do not invent Indian Standard numbers, titles, regulatory requirements, certifications, dates, or applicability. If the evidence is insufficient, explicitly say "Insufficient verified data". Distinguish semantic relevance from verified regulatory fact. Use evidence IDs exactly as supplied (E1, E2...).\n\nUser query: ${cleanQuery}\nPreferred language: ${language === 'hi' ? 'Hindi' : 'English'}\n\nEvidence:\n${context}\n\nReturn ONLY valid JSON with this shape:\n{"answer":"...","recommendations":[{"evidenceIds":["E1"],"reason":"...","confidence":"high|medium|low"}],"gaps":["..."],"verificationNotes":["..."]}\nRecommendations must cite one or more evidence IDs. Never create an evidence ID that is not present.`;

  let ai;
  try {
    ai = await generateStructured(prompt);
  } catch (error) {
    if (error.code === 'LLM_NOT_CONFIGURED') throw error;
    ai = { answer: fallbackAnswer(cleanQuery, evidence), recommendations: [], gaps: [error.message], verificationNotes: ['AI synthesis was unavailable; semantic evidence is still shown.'] };
  }

  const recommendations = [];
  const seen = new Set();
  for (const item of Array.isArray(ai?.recommendations) ? ai.recommendations : []) {
    const ids = Array.isArray(item?.evidenceIds) ? item.evidenceIds : [];
    const selected = ids.map((id) => evidence.find((e) => e.evidenceId === id)).filter(Boolean);
    if (!selected.length) continue;
    const standard = selected.find((e) => e.standardId) || selected[0];
    const key = standard.standardId || standard.documentId || standard.evidenceId;
    if (seen.has(key)) continue;
    seen.add(key);
    recommendations.push({
      standardId: standard.standardId,
      standardNumber: standard.standardNumber,
      title: standard.title,
      relevanceScore: Math.max(...selected.map((e) => e.score)),
      confidence: ['high', 'medium', 'low'].includes(item.confidence) ? item.confidence : 'medium',
      reason: String(item.reason || 'Relevant evidence was retrieved for this requirement.'),
      evidenceIds: selected.map((e) => e.evidenceId),
      verified: selected.some((e) => e.verified),
      source: standard.source || null
    });
  }

  if (userId && mongoose.isValidObjectId(userId)) {
    await Recommendation.create({
      userId,
      query: cleanQuery,
      language,
      standardId: recommendations.find((r) => r.standardId)?.standardId || null,
      score: recommendations[0]?.relevanceScore || evidence[0]?.score || 0,
      ranking: 1,
      explanation: String(ai?.answer || fallbackAnswer(cleanQuery, evidence)),
      evidence,
      relatedStandards: recommendations,
      verificationStatus: recommendations.some((r) => r.verified) ? 'partially_verified_metadata' : 'unverified_semantic_match'
    });
  }

  return {
    query: cleanQuery,
    language,
    answer: String(ai?.answer || fallbackAnswer(cleanQuery, evidence)),
    recommendations,
    evidence,
    gaps: Array.isArray(ai?.gaps) ? ai.gaps.map(String) : [],
    verificationNotes: Array.isArray(ai?.verificationNotes) ? ai.verificationNotes.map(String) : [],
    llm: llmConfig(),
    notice: 'AI relevance is generated from indexed evidence. Verify regulatory facts, current status, and applicability against authoritative sources before procurement decisions.'
  };
}

export async function recommendationHistory(userId, limit = 20) {
  return Recommendation.find({ userId }).sort({ createdAt: -1 }).limit(Math.min(Math.max(Number(limit) || 20, 1), 50)).select('-__v');
}
