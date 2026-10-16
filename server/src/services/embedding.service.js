import { env } from '../config/env.js';

const DEFAULT_MODEL = 'gemini-embedding-001';
const DIMENSIONS = 384;
const BATCH_SIZE = 100;

function l2Normalize(vector) {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return norm ? vector.map((value) => value / norm) : vector;
}

function normalizeBatch(embeddings, expected) {
  if (!Array.isArray(embeddings) || embeddings.length !== expected) {
    throw new Error(`Gemini returned ${Array.isArray(embeddings) ? embeddings.length : 'an invalid number of'} vectors for ${expected} inputs.`);
  }

  return embeddings.map(({ values } = {}) => {
    if (!Array.isArray(values) || values.length !== DIMENSIONS || !values.every((value) => Number.isFinite(Number(value)))) {
      throw new Error(`Gemini must return a ${DIMENSIONS}-dimensional embedding vector.`);
    }
    return l2Normalize(values.map(Number));
  });
}

export function embeddingConfig() {
  return {
    provider: String(env.EMBEDDING_PROVIDER || 'gemini').toLowerCase(),
    model: env.EMBEDDING_MODEL || DEFAULT_MODEL,
    dimensions: DIMENSIONS,
    configured: Boolean(env.EMBEDDING_API_KEY)
  };
}

async function callGemini(inputs, taskType) {
  if (!env.EMBEDDING_API_KEY) {
    const error = new Error('A Gemini API key is not configured. Set EMBEDDING_API_KEY, GEMINI_API_KEY, or LLM_API_KEY in server/.env.');
    error.code = 'EMBEDDING_NOT_CONFIGURED';
    throw error;
  }

  const model = (env.EMBEDDING_MODEL || DEFAULT_MODEL).replace(/^models\//, '');
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:batchEmbedContents`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'x-goog-api-key': env.EMBEDDING_API_KEY,
      'Content-Type': 'application/json'
    },
    signal: AbortSignal.timeout(60000),
    body: JSON.stringify({
      model: `models/${model}`,
      requests: inputs.map((text) => ({
        model: `models/${model}`,
        content: { parts: [{ text }] },
        taskType,
        outputDimensionality: DIMENSIONS
      }))
    })
  });

  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = raw; }
  if (!response.ok) {
    const message = typeof data === 'object' ? data?.error?.message || JSON.stringify(data) : String(data);
    const error = new Error(`Embedding provider request failed (${response.status}): ${message}`);
    error.code = 'EMBEDDING_PROVIDER_ERROR';
    throw error;
  }
  return normalizeBatch(data?.embeddings, inputs.length);
}

export async function embedTexts(texts, { taskType = 'RETRIEVAL_DOCUMENT' } = {}) {
  const clean = texts.map((text) => String(text || '').trim()).filter(Boolean);
  if (!clean.length) return [];

  const provider = String(env.EMBEDDING_PROVIDER || 'gemini').toLowerCase();
  if (provider !== 'gemini') {
    const error = new Error(`Unsupported embedding provider: ${provider}`);
    error.code = 'EMBEDDING_PROVIDER_UNSUPPORTED';
    throw error;
  }

  const vectors = [];
  for (let start = 0; start < clean.length; start += BATCH_SIZE) {
    const batch = clean.slice(start, start + BATCH_SIZE);
    vectors.push(...await callGemini(batch, taskType));
  }
  return vectors;
}

export async function embedText(text, options) {
  const [vector] = await embedTexts([text], options);
  return vector;
}

export { DIMENSIONS };
