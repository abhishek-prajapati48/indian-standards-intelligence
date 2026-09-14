import test from 'node:test';
import assert from 'node:assert/strict';
import { embeddingConfig } from '../src/services/embedding.service.js';

test('embedding config exposes the 384-dimensional provider contract', () => {
  const config = embeddingConfig();
  assert.equal(config.dimensions, 384);
  assert.ok(config.provider);
  assert.ok(config.model);
});
