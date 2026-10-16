import test from 'node:test';
import assert from 'node:assert/strict';
import { embeddingConfig } from '../src/services/embedding.service.js';
import { chunkText } from '../src/services/document.service.js';
import { splitRequirements } from '../src/services/tender.service.js';
import { addPreviousChunkContext } from '../src/services/rag.service.js';

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

test('document chunks prefer complete sentence boundaries when possible', () => {
  const first = 'The bidder shall provide electrical safety test reports.';
  const second = 'The supplier shall include a two-year warranty.';
  const source = `${first} ${second} ${'Additional technical requirement. '.repeat(35)}`;
  const chunks = chunkText(source, 120, 0);

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.endsWith('.') || chunk.includes('. ')));
  assert.ok(chunks[0].startsWith(first));
});

test('tender requirements split into readable sentences without leading conjunctions', () => {
  const source = [
    'The bidder shall provide accredited laboratory electrical safety test reports for every supplied unit.',
    'The supplier must provide installation, commissioning and warranty details for each unit.',
    'The tenderer shall identify applicable IS 17550 Part 1:2024 and provide evidence.'
  ].join(' ');
  const requirements = splitRequirements(source);

  assert.ok(requirements.length >= 3);
  assert.ok(requirements.every((item) => item.text && item.type && !/^(and|or|but)\b/i.test(item.text)));
});

test('tender requirement extraction skips empty text and compliance-matrix placeholders', () => {
  const requirements = splitRequirements([
    'R-01 Comply / Deviate Document reference Req. ID Bidder Response Evidence',
    'The bidder shall submit valid electrical safety test reports for the supplied refrigerator.',
    'The supplier shall provide a minimum warranty period of two years after commissioning.'
  ].join('\n'));

  assert.equal(requirements.length, 2);
  assert.ok(requirements.every((item) => item.text.length >= 35 && item.type));
});

test('evidence fragments beginning mid-sentence include context from the previous chunk', () => {
  const current = { chunkIndex: 1, text: 'and storage properties shall meet the listed limits.' };
  const previous = { text: 'The appliance shall provide safe operation and storage properties are tested.' };
  const contextual = addPreviousChunkContext(current, previous);

  assert.ok(contextual.startsWith('…'));
  assert.ok(contextual.includes('The appliance shall provide safe operation'));
  assert.ok(contextual.endsWith(current.text));
});
