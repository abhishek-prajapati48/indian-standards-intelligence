import mongoose from 'mongoose';
import Standard from '../models/Standard.js';
import Document from '../models/Document.js';
import Recommendation from '../models/Recommendation.js';
import StandardChunk from '../models/StandardChunk.js';
import { semanticVectorSearch } from './vector.service.js';

export function addPreviousChunkContext(chunk, previousChunk) {
  const text = String(chunk?.text || '').trim();
  const previousText = String(previousChunk?.text || '').trim();
  if (!text || !previousText || !(Number(chunk.chunkIndex) > 0) || !/^[a-z]/.test(text)) return text;

  const maxOverlap = Math.min(240, text.length, previousText.length);
  for (let length = maxOverlap; length >= 40; length -= 1) {
    if (text.startsWith(previousText.slice(-length))) return text;
  }

  let context = previousText.slice(-360);
  const boundary = Math.max(context.lastIndexOf('. '), context.lastIndexOf('! '), context.lastIndexOf('? '));
  if (boundary >= 0) context = context.slice(boundary + 2);
  if (context.length > 300) context = context.slice(-300);
  return `… ${context.trim()} ${text}`;
}

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

async function includePreviousChunkContext(chunks) {
  const targets = chunks.filter((chunk) => (
    chunk.documentId && Number(chunk.chunkIndex) > 0 && /^[a-z]/.test(String(chunk.text || '').trim())
  ));
  if (!targets.length) return chunks;

  const previousChunks = await StandardChunk.find({
    $or: targets.map((chunk) => ({
      documentId: chunk.documentId,
      chunkIndex: Number(chunk.chunkIndex) - 1
    }))
  }).select('documentId chunkIndex text').lean();
  const previousByKey = new Map(previousChunks.map((chunk) => [`${chunk.documentId}:${chunk.chunkIndex}`, chunk]));

  return chunks.map((chunk) => {
    const previous = previousByKey.get(`${chunk.documentId}:${Number(chunk.chunkIndex) - 1}`);
    return previous ? { ...chunk, text: addPreviousChunkContext(chunk, previous) } : chunk;
  });
}

export function deduplicateEvidenceChunks(chunks) {
  const seen = new Set();
  return chunks.filter((chunk) => {
    const signature = String(chunk?.text || '')
      .replace(/^…\s*/, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
    if (!signature || seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

const QUERY_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'for', 'from', 'give', 'how', 'in', 'is', 'me', 'of',
  'on', 'or', 'please', 'recommend', 'requirements', 'standard', 'standards',
  'should', 'apply', 'applicable', 'compliance', 'compliant', 'criteria',
  'guideline', 'guidelines', 'specification', 'specifications', 'the', 'to',
  'what', 'which', 'with'
]);

const TOPIC_SYNONYMS = [
  ['television', 'televisions', 'tv', 'tvs'],
  ['refrigerator', 'refrigerators', 'fridge', 'fridges'],
  ['airconditioner', 'airconditioning', 'ac'],
  ['washingmachine', 'washingmachines', 'washer', 'washers'],
  ['microwave', 'microwaves'],
  ['waterheater', 'waterheaters', 'geyser', 'geysers'],
  ['laptop', 'laptops', 'notebook', 'notebooks'],
  ['mobilephone', 'mobilephones', 'smartphone', 'smartphones', 'phone', 'phones']
];

function canonicalTopicToken(token) {
  const compact = token.replace(/\s+/g, '');
  return TOPIC_SYNONYMS.find((group) => group.includes(compact))?.[0] || compact;
}

function topicTokens(text) {
  return String(text || '')
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu)
    ?.filter((token) => (token.length > 2 || TOPIC_SYNONYMS.some((group) => group.includes(token)))
      && !QUERY_STOP_WORDS.has(token))
    .map(canonicalTopicToken) || [];
}

export function filterEvidenceForQuery(query, chunks) {
  const queryTopics = topicTokens(query);
  if (!queryTopics.length) return chunks;
  const topicSet = new Set(queryTopics);
  return chunks.filter((chunk) => {
    const evidenceTopics = topicTokens([
      chunk.text,
      chunk.standardNumber,
      chunk.title,
      chunk.documentName
    ].filter(Boolean).join(' '));
    return evidenceTopics.some((token) => topicSet.has(token));
  });
}

export function explainRetrievedEvidence(query, evidence) {
  if (!evidence.length) {
    return `Semantic search found no indexed passages relevant to “${query}”. No recommendation can be made from the current indexed documents.`;
  }
  const top = evidence[0];
  const excerpt = top.text.replace(/\s+/g, ' ').trim().slice(0, 320);
  return `Semantic search retrieved ${evidence.length} passage${evidence.length === 1 ? '' : 's'} from indexed project documents for “${query}”, ranked by similarity. The highest-ranked passage is E1 from “${top.documentName}” (${(top.score * 100).toFixed(1)}% similarity): “${excerpt}${top.text.length > 320 ? '…' : ''}”`;
}

export async function generateRecommendation({ userId, query, limit = 8 }) {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) throw Object.assign(new Error('Query is required.'), { code: 'QUERY_REQUIRED' });

  const retrievedChunks = await semanticVectorSearch({ query: cleanQuery, limit: Math.min(Math.max(Number(limit) || 8, 4), 12) });
  const contextualChunks = await includePreviousChunkContext(retrievedChunks);
  const standardIds = [...new Set(contextualChunks.map((c) => String(c.standardId || '')).filter((id) => mongoose.isValidObjectId(id)))];
  const documentIds = [...new Set(contextualChunks.map((c) => String(c.documentId || '')).filter((id) => mongoose.isValidObjectId(id)))];
  const [standards, documents] = await Promise.all([
    standardIds.length ? Standard.find({ _id: { $in: standardIds } }).select('standardNumber title description category status verified source relatedStandards normativeReferences').lean() : [],
    documentIds.length ? Document.find({ _id: { $in: documentIds } }).select('originalName source standardId').lean() : []
  ]);

  const standardById = new Map(standards.map((standard) => [String(standard._id), standard]));
  const documentById = new Map(documents.map((document) => [String(document._id), document]));
  const relevantChunks = contextualChunks.map((chunk) => ({
    ...chunk,
    standardNumber: standardById.get(String(chunk.standardId))?.standardNumber,
    title: standardById.get(String(chunk.standardId))?.title,
    documentName: documentById.get(String(chunk.documentId))?.originalName
  }));
  const chunks = deduplicateEvidenceChunks(filterEvidenceForQuery(cleanQuery, relevantChunks));
  const evidence = compactEvidence(chunks, standards, documents);
  const language = detectLanguage(cleanQuery);
  const answer = explainRetrievedEvidence(cleanQuery, evidence);
  const groupedEvidence = new Map();
  for (const item of evidence) {
    const key = item.standardId || item.documentId || item.evidenceId;
    const group = groupedEvidence.get(key) || [];
    group.push(item);
    groupedEvidence.set(key, group);
  }
  const recommendations = [...groupedEvidence.values()].map((items) => {
    const source = items[0];
    const citations = items.map((item) => item.evidenceId);
    return {
      standardId: source.standardId,
      standardNumber: source.standardNumber,
      title: source.title,
      relevanceScore: Math.max(...items.map((item) => item.score)),
      confidence: source.score >= 0.75 ? 'high' : source.score >= 0.5 ? 'medium' : 'low',
      reason: `Retrieved from ${source.documentName} as semantically relevant to the query. Source excerpt: “${source.text.replace(/\s+/g, ' ').slice(0, 280)}${source.text.length > 280 ? '…' : ''}”`,
      evidenceIds: citations,
      verified: source.verified,
      source: source.source
    };
  });

  if (userId && mongoose.isValidObjectId(userId)) {
    await Recommendation.create({
      userId,
      query: cleanQuery,
      language,
      standardId: recommendations.find((r) => r.standardId)?.standardId || null,
      score: recommendations[0]?.relevanceScore || evidence[0]?.score || 0,
      ranking: 1,
      explanation: answer,
      evidence,
      relatedStandards: recommendations,
      verificationStatus: recommendations.some((r) => r.verified) ? 'partially_verified_metadata' : 'unverified_semantic_match'
    });
  }

  return {
    query: cleanQuery,
    language,
    answer,
    recommendations,
    evidence,
    gaps: evidence.length ? [] : ['No relevant passages were found in the indexed documents.'],
    verificationNotes: ['Results are semantic matches to indexed document text, not independent verification of regulatory status or applicability.'],
    notice: 'This explanation is assembled from semantic-search results and their source excerpts. No generative model or web search is used.'
  };
}

export async function recommendationHistory(userId, limit = 20) {
  return Recommendation.find({ userId }).sort({ createdAt: -1 }).limit(Math.min(Math.max(Number(limit) || 20, 1), 50)).select('-__v');
}
