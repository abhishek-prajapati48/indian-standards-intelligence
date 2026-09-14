import test from 'node:test';
import assert from 'node:assert/strict';
import { isTenderLikeText } from '../src/services/tender.service.js';

test('rejects resume/CV text as a tender source', () => {
  const resume = `CURRICULUM VITAE Resume. Email address govind@example.com. Phone number 9999999999. Career objective: To obtain a challenging position. Education: Bachelor of Technology. Skills: JavaScript, React, Node.js and MongoDB. Professional experience includes software development and web application projects.`;
  assert.equal(isTenderLikeText(resume).valid, false);
});

test('accepts procurement tender text', () => {
  const tender = `REQUEST FOR PROPOSAL / TENDER for supply and installation of electrical equipment. The bidder shall comply with the technical specification and applicable IS standards. Eligibility criteria require valid certification. The supplier must provide test certificates and warranty. Bid submission deadline is 30 September. Performance security and delivery schedule shall apply. The procuring entity will inspect and accept the supplied equipment.`;
  assert.equal(isTenderLikeText(tender).valid, true);
});

test('rejects generic text without enough tender indicators', () => {
  const generic = `This document describes a product and its general background. It contains some technical information and a few notes about safety, quality and installation. There is no procurement process, bidder information, scope of supply, quotation, contract or submission requirement.`;
  assert.equal(isTenderLikeText(generic).valid, false);
});
