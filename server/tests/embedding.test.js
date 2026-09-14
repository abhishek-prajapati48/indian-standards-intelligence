import test from 'node:test';
import assert from 'node:assert/strict';
import { embeddingConfig } from '../src/services/embedding.service.js';
import { chunkText } from '../src/services/document.service.js';

test('embedding config exposes the 384-dimensional provider contract', () => {
  const config = embeddingConfig();
  assert.equal(config.dimensions, 384);
  assert.ok(config.provider);
  assert.ok(config.model);
});

test('document chunks end and restart on word boundaries', () => {
  const source = Array.from({ length: 90 }, (_, index) => `word${index}`).join(' ');
  const sourceWords = new Set(source.split(' '));
  const chunks = chunkText(source, 80, 12);

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.split(/\s+/).every((word) => sourceWords.has(word))));
  assert.equal(chunks.at(-1).split(/\s+/).at(-1), 'word89');
});
