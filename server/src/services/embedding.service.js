import { env } from '../config/env.js';

const DEFAULT_MODEL = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2';
const DIMENSIONS = 384;
const BATCH_SIZE = 4;

function meanPoolTokenEmbeddings(tokens) {
  if (!Array.isArray(tokens) || !tokens.length) return null;
  const dimensions = tokens[0]?.length;
  if (!dimensions) return null;
  const vector = Array(dimensions).fill(0);
  let count = 0;
  for (const token of tokens) {
    if (!Array.isArray(token) || token.length !== dimensions) continue;
    for (let i = 0; i < dimensions; i += 1) vector[i] += Number(token[i]) || 0;
    count += 1;
  }
  if (!count) return null;
  return vector.map((value) => value / count);
}

function l2Normalize(vector) {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return norm ? vector.map((value) => value / norm) : vector;
}

function normalizeOne(output) {
  if (!Array.isArray(output)) throw new Error('Embedding provider returned an invalid response.');
  if (output.length === DIMENSIONS && output.every((value) => Number.isFinite(Number(value)))) {
    return l2Normalize(output.map(Number));
  }
  const pooled = meanPoolTokenEmbeddings(output);
  if (!pooled) throw new Error('Unable to pool embedding provider response.');
  return l2Normalize(pooled);
}

function normalizeBatch(output, expected) {
  if (expected === 1) return [normalizeOne(output)];
  if (!Array.isArray(output) || output.length !== expected) {
    throw new Error(`Embedding provider returned ${Array.isArray(output) ? output.length : 'an invalid number of'} vectors for ${expected} inputs.`);
  }
  return output.map(normalizeOne);
}

export function embeddingConfig() {
  return {
    provider: env.EMBEDDING_PROVIDER,
    model: env.EMBEDDING_MODEL,
    dimensions: DIMENSIONS,
    configured: Boolean(env.EMBEDDING_API_KEY)
  };
}

async function callHuggingFace(inputs) {
  if (!env.EMBEDDING_API_KEY) {
    const error = new Error('EMBEDDING_API_KEY is not configured. Create a Hugging Face access token with Inference Providers permission and add it to server/.env.');
    error.code = 'EMBEDDING_NOT_CONFIGURED';
    throw error;
  }

  const model = env.EMBEDDING_MODEL || DEFAULT_MODEL;
  const endpoint = `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(model).replace(/%2F/g, '/')}/pipeline/feature-extraction`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.EMBEDDING_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ inputs })
  });

  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = raw; }
  if (!response.ok) {
    const message = typeof data === 'object' ? data?.error || JSON.stringify(data) : String(data);
    const error = new Error(`Embedding provider request failed (${response.status}): ${message}`);
    error.code = 'EMBEDDING_PROVIDER_ERROR';
    throw error;
  }
  return normalizeBatch(data, inputs.length);
}

export async function embedTexts(texts) {
  const clean = texts.map((text) => String(text || '').trim()).filter(Boolean);
  if (!clean.length) return [];
  const provider = String(env.EMBEDDING_PROVIDER || 'huggingface').toLowerCase();
  if (provider !== 'huggingface') {
    const error = new Error(`Unsupported embedding provider: ${provider}`);
    error.code = 'EMBEDDING_PROVIDER_UNSUPPORTED';
    throw error;
  }

  const vectors = [];
  for (let start = 0; start < clean.length; start += BATCH_SIZE) {
    const batch = clean.slice(start, start + BATCH_SIZE);
    const batchVectors = await callHuggingFace(batch);
    vectors.push(...batchVectors);
  }
  return vectors;
}

export async function embedText(text) {
  const [vector] = await embedTexts([text]);
  return vector;
}

export { DIMENSIONS };
