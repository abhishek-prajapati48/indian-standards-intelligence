import test from 'node:test';
import assert from 'node:assert/strict';
import { deduplicateEvidenceChunks, explainRetrievedEvidence, filterEvidenceForQuery } from '../src/services/rag.service.js';

test('search explanation reports the retrieved source excerpt without generating new advice', () => {
  const evidence = [{
    evidenceId: 'E1',
    documentName: 'refrigerator-standard.pdf',
    score: 0.86,
    text: 'Electrical safety requirements for household refrigerators.'
  }];

  const answer = explainRetrievedEvidence('Refrigerator standards', evidence);

  assert.match(answer, /Semantic search retrieved 1 passage/);
  assert.match(answer, /refrigerator-standard\.pdf/);
  assert.match(answer, /86\.0% similarity/);
  assert.match(answer, /Electrical safety requirements/);
  assert.doesNotMatch(answer, /should use|must comply|is required/);
});

test('search explanation clearly reports when no indexed evidence was retrieved', () => {
  const answer = explainRetrievedEvidence('Refrigerator standards', []);

  assert.match(answer, /found no indexed passages/);
  assert.match(answer, /No recommendation can be made/);
});

test('duplicate source text is shown once in semantic evidence', () => {
  const chunks = [
    { _id: 'first', text: 'Electrical safety shall be supported by test evidence.' },
    { _id: 'duplicate', text: 'Electrical safety, shall be supported by test evidence!' },
    { _id: 'different', text: 'The appliance must include a two-year warranty.' }
  ];

  assert.deepEqual(deduplicateEvidenceChunks(chunks).map(({ _id }) => _id), ['first', 'different']);
});

test('television searches exclude refrigerator passages even when vector similarity is high', () => {
  const chunks = [
    { _id: 'fridge', text: 'Requirements for laboratory refrigerators include temperature control.', score: 0.91 },
    { _id: 'television', text: 'Television receivers must meet electrical safety requirements.', score: 0.62 }
  ];

  assert.deepEqual(filterEvidenceForQuery('Requirements for television', chunks).map(({ _id }) => _id), ['television']);
});

test('common product aliases preserve relevant semantic results', () => {
  const chunks = [
    { _id: 'tv', text: 'Television receivers require electrical safety testing.' },
    { _id: 'fridge', text: 'Refrigerator storage temperature requirements.' }
  ];

  assert.deepEqual(filterEvidenceForQuery('TV standards', chunks).map(({ _id }) => _id), ['tv']);
});

test('generic queries keep semantic results when they have no specific topic', () => {
  const chunks = [{ _id: 'source', text: 'Indexed text passage.' }];

  assert.equal(filterEvidenceForQuery('What standards should apply?', chunks).length, 1);
});
