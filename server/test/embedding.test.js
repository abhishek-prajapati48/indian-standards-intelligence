import test from 'node:test';
import assert from 'node:assert/strict';

process.env.EMBEDDING_PROVIDER = 'gemini';
process.env.EMBEDDING_MODEL = 'gemini-embedding-001';
process.env.EMBEDDING_API_KEY = 'test-gemini-key';
process.env.GEMINI_API_KEY = 'test-gemini-key';

const { DIMENSIONS, embedTexts, embeddingConfig } = await import('../src/services/embedding.service.js');

test('embedding config exposes Gemini and the 384-dimensional Atlas vector contract', () => {
  const config = embeddingConfig();
  assert.equal(config.provider, 'gemini');
  assert.equal(config.model, 'gemini-embedding-001');
  assert.equal(config.dimensions, DIMENSIONS);
  assert.equal(config.dimensions, 384);
  assert.equal(config.configured, true);
});

test('Gemini embeddings batch texts with retrieval task and requested output dimensions', async (t) => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    return new Response(JSON.stringify({
      embeddings: calls.at(-1).body.requests.map(() => ({ values: Array(DIMENSIONS).fill(1) }))
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const vectors = await embedTexts(['one', 'two', 'three', 'four', 'five'], { taskType: 'RETRIEVAL_QUERY' });

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /models\/gemini-embedding-001:batchEmbedContents$/);
  assert.equal(calls[0].options.headers['x-goog-api-key'], 'test-gemini-key');
  assert.deepEqual(calls.map(({ body }) => body.requests.length), [5]);
  assert.ok(calls.every(({ body }) => body.requests.every((request) => (
    request.model === 'models/gemini-embedding-001'
    && request.taskType === 'RETRIEVAL_QUERY'
    && request.outputDimensionality === DIMENSIONS
  ))));
  assert.equal(calls[0].body.model, 'models/gemini-embedding-001');
  assert.equal(vectors.length, 5);
  assert.ok(vectors.every((vector) => vector.length === DIMENSIONS));
  assert.ok(vectors.every((vector) => Math.abs(Math.sqrt(vector.reduce((sum, value) => sum + value ** 2, 0)) - 1) < 1e-10));
});

test('Gemini errors remain explicit and retain the provider error code', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: { message: 'Quota exceeded' }
  }), { status: 429, headers: { 'Content-Type': 'application/json' } });
  t.after(() => { globalThis.fetch = originalFetch; });

  await assert.rejects(embedTexts(['test']), (error) => (
    error.code === 'EMBEDDING_PROVIDER_ERROR'
    && error.message.includes('Quota exceeded')
  ));
});

test('Gemini response vectors must match the Atlas index dimensions', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    embeddings: [{ values: [0.1, 0.2] }]
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  t.after(() => { globalThis.fetch = originalFetch; });

  await assert.rejects(embedTexts(['test']), /384-dimensional embedding vector/);
});
