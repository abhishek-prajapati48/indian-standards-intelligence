import mongoose from 'mongoose';
import Tender from '../models/Tender.js';
import TenderRequirement from '../models/TenderRequirement.js';
import Standard from '../models/Standard.js';
import Document from '../models/Document.js';
import { semanticVectorSearchByVector } from './vector.service.js';
import { embedTexts, embeddingConfig } from './embedding.service.js';
import { generateStructured, llmConfig } from './llm.service.js';

const MAX_REQUIREMENTS = 24;

const TENDER_SIGNAL_PATTERNS = [
  /\b(tender|e-?tender|procurement|bid|bidder|bidding|request for proposal|rfp|request for quotation|rfq|quotation)\b/i,
  /\b(contract|contractor|purchaser|procuring entity|buyer|supplier|vendor)\b/i,
  /\b(scope of work|scope of supply|technical specification|terms and conditions|eligibility criteria|qualification criteria)\b/i,
  /\b(bill of quantities|boq|price schedule|commercial bid|technical bid|financial bid)\b/i,
  /\b(emd|earnest money|performance security|performance bank guarantee|pbg|security deposit)\b/i,
  /\b(delivery schedule|delivery period|inspection and acceptance|liquidated damages|penalty|warranty period)\b/i,
  /\b(compliance|conformity|shall comply|must comply|bid submission|submission deadline|last date|opening date)\b/i,
  /\b(is\s*\/?iso|is\s*\/?iec|iso|iec)\s*[-:]?\s*\d{2,7}\b/i,
];
const NON_TENDER_PATTERNS = [
  /\b(resume|curriculum vitae|cv|cover letter|job application|employment history|work experience|career objective)\b/i,
  /\b(skills|education|academic qualification|professional experience|linkedin|phone number|email address)\b/i,
];

export function isTenderLikeText(text) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (value.length < 80) return { valid: false, score: 0, reason: 'The submitted text is too short to reliably identify a tender.' };
  const positiveSignals = TENDER_SIGNAL_PATTERNS.filter((pattern) => pattern.test(value)).length;
  const negativeSignals = NON_TENDER_PATTERNS.filter((pattern) => pattern.test(value)).length;
  // Detect explicit negation before counting words inside that negation as
  // positive tender evidence (e.g. "no procurement process").
  if (/\b(no|not|without|never)\s+(?:a\s+)?(?:procurement|tender|bid|bidding|bidder|quotation|contract|scope of supply|submission)\b/i.test(value)) {
    return { valid: false, score: 0, reason: 'The document explicitly indicates that it is not a procurement/tender document.' };
  }
  const strongTenderSignals = /\b(tender|e-?tender|procurement|bidder|bidding|request for proposal|rfp|request for quotation|rfq)\b/i.test(value);
  // A document that explicitly negates procurement concepts should not be
  // classified as a tender merely because words such as contract/scope/safety
  // occur in the negation.
  if (!strongTenderSignals && /\b(no|not|without|never)\b[^.]{0,180}\b(procurement|tender|bidder|quotation|contract|scope of supply|submission)\b/i.test(value)) {
    return { valid: false, score: 0, reason: 'The document explicitly indicates that it is not a procurement/tender document.' };
  }
  // A clear non-tender document must not be treated as a tender just because it contains generic words.
  if (negativeSignals >= 2 && positiveSignals < 2) {
    return { valid: false, score: positiveSignals, reason: 'The document appears to be a resume, CV, job application, or another non-tender document.' };
  }
  // Require either a strong tender signal or multiple independent procurement signals.
  const valid = positiveSignals >= 2 || (positiveSignals >= 1 && /\b(shall|must|required|specification|standard|certificate|testing|safety)\b/i.test(value));
  return {
    valid,
    score: positiveSignals,
    reason: valid ? '' : 'The document does not contain enough tender/procurement indicators for tender validation.'
  };
}

const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim();

function classify(line) {
  const s = line.toLowerCase();
  if (/\b(test|testing|laboratory|sample|inspection)\b/.test(s)) return 'testing';
  if (/\b(safety|safe|hazard|fire|electrical|protection)\b/.test(s)) return 'safety';
  if (/\b(install|installation|commission|site)\b/.test(s)) return 'installation';
  if (/\b(certif|license|licence|registration|marking|conformity)\b/.test(s)) return 'certification';
  if (/\b(packaging|label|labelling|storage|transport)\b/.test(s)) return 'quality';
  return 'technical';
}

function splitRequirements(text) {
  const lines = String(text || '').replace(/\r/g, '').split(/\n+/).map(clean).filter(Boolean);
  const candidates = [];
  for (const line of lines) {
    const item = line.replace(/^(?:[-•*▪◦]|\(?\d{1,3}[.)])\s*/, '').trim();
    if (item.length < 25 || item.length > 700) continue;
    if (/^(contents|table of contents|introduction|background|scope|definitions|general conditions|instructions to bidders)$/i.test(item)) continue;
    if (/\b(shall|must|required|required to|comply|conform|meet|provide|include|should|specification|standard|certificate|test|safety|installation|warranty)\b/i.test(item)) candidates.push(item);
  }
  if (candidates.length < 3) {
    for (const sentence of String(text || '').split(/(?<=[.!?])\s+/).map(clean)) {
      if (sentence.length >= 35 && sentence.length <= 700 && /\b(shall|must|required|comply|conform|standard|certificate|test|safety)\b/i.test(sentence)) candidates.push(sentence);
    }
  }
  return [...new Set(candidates)].slice(0, MAX_REQUIREMENTS);
}

function normalizeStandardRef(value) {
  return clean(value)
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s*:\s*/g, ':')
    .replace(/\s*-\s*/g, '-')
    .trim();
}

function extractExplicitStandards(text) {
  const refs = [];
  const pattern = /\b(?:IS(?:\s*\/\s*(?:ISO|IEC))?|ISO|IEC)\s*[-:]?\s*\d{2,7}(?:\s+(?:Part|PART)\s*[-:]?\s*\d{1,3})?(?:\s*[-:]\s*\d{1,4})?(?:\s*:\s*\d{4})?(?:\s*\([^)]*\))?/gi;
  for (const m of String(text || '').matchAll(pattern)) refs.push(normalizeStandardRef(m[0]));
  return [...new Set(refs)].slice(0, 30);
}

function standardNumberCandidates(ref) {
  const normalized = normalizeStandardRef(ref);
  const candidates = new Set([normalized]);
  const m = normalized.match(/^(IS(?:\/ISO|\/IEC)?|ISO|IEC)\s*([0-9]{2,7})(?:\s*[:\-]?\s*(?:Part|PART)\s*[:\-]?\s*([0-9]{1,3}))?(?:\s*[:\-]\s*(\d{4}))?/i);
  if (m) {
    const family = m[1].replace(/\s+/g, '');
    const base = m[2];
    const part = m[3];
    const year = m[4];
    // Canonical semantic key used for matching different BIS formatting variants.
    const canonical = `${family}|${base}|${part || ''}|${year || ''}`;
    candidates.add(canonical);
  }
  return [...candidates].filter(Boolean);
}

function standardReferenceQuery(ref) {
  const normalized = normalizeStandardRef(ref);
  const m = normalized.match(/^(IS(?:\/ISO|\/IEC)?|ISO|IEC)\s*([0-9]{2,7})(?:\s*[:\-]?\s*(?:Part|PART)\s*[:\-]?\s*([0-9]{1,3}))?(?:\s*[:\-]\s*(\d{4}))?/i);
  if (!m) return [{ standardNumber: { $regex: normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }];
  const family = m[1].replace(/\s+/g, '');
  const base = m[2];
  const part = m[3];
  const year = m[4];
  const familyRx = family.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const baseRx = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const clauses = [{ standardNumber: { $regex: `^${familyRx}\\s*${baseRx}\\b`, $options: 'i' } }];
  if (part) {
    const partRx = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    clauses[0] = { standardNumber: { $regex: `^${familyRx}\\s*${baseRx}\\s*(?::\\s*)?(?:Part|PART)\\s*(?::\\s*)?${partRx}\\b`, $options: 'i' } };
  }
  if (year) {
    const yearRx = year.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const basePattern = part
      ? `^${familyRx}\\s*${baseRx}\\s*(?::\\s*)?(?:Part|PART)\\s*(?::\\s*)?${part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*(?:${yearRx})`
      : `^${familyRx}\\s*${baseRx}.*(?:${yearRx})`;
    clauses[0] = { standardNumber: { $regex: basePattern, $options: 'i' } };
  }
  return clauses;
}

async function findMatches(requirement, explicitRefs, queryVector = null) {
  const matches = [];
  const lowerRequirement = requirement.toLowerCase();
  const refs = explicitRefs.filter((r) => {
    const candidates = standardNumberCandidates(r);
    return candidates.some((candidate) => lowerRequirement.includes(candidate.toLowerCase())) || lowerRequirement.includes(r.toLowerCase());
  });

  if (refs.length) {
    const clauses = [];
    for (const ref of refs) {
      clauses.push(...standardReferenceQuery(ref));
    }
    if (clauses.length) {
      const found = await Standard.find({ $or: clauses })
        .select('standardNumber title description status verified source')
        .limit(10);
      matches.push(...found.map((standard) => ({ standard, score: 1, source: 'explicit-reference' })));
    }
  }

  const terms = clean(requirement).split(/\s+/).filter((x) => x.length > 3).slice(0, 10);
  if (terms.length) {
    const rx = terms.slice(0, 6).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const found = await Standard.find({
      $or: [
        { title: { $regex: rx, $options: 'i' } },
        { description: { $regex: rx, $options: 'i' } },
        { keywords: { $regex: rx, $options: 'i' } }
      ]
    }).select('standardNumber title description status verified source').limit(5);
    for (const standard of found) {
      if (!matches.some((m) => String(m.standard._id) === String(standard._id))) {
        matches.push({ standard, score: 0.55, source: 'registry-keyword-match' });
      }
    }
  }

  // Semantic search is the expensive part. Only use it when no registry match
  // exists, or when we have a precomputed vector from the batch embedding pass.
  if (!matches.length && queryVector) {
    try {
      const hits = await semanticVectorSearchByVector({ queryVector, limit: 4 });
      const ids = [...new Set(hits.map((x) => String(x.standardId || '')).filter((id) => mongoose.isValidObjectId(id)))];
      if (ids.length) {
        const found = await Standard.find({ _id: { $in: ids } }).select('standardNumber title description status verified source');
        const byId = new Map(found.map((s) => [String(s._id), s]));
        for (const hit of hits) {
          const standard = byId.get(String(hit.standardId));
          if (standard && !matches.some((m) => String(m.standard._id) === String(standard._id))) {
            matches.push({ standard, score: Number(hit.score || 0), source: 'vector-search' });
          }
        }
      }
    } catch {
      // Vector Search is supplementary; deterministic registry matching remains usable.
    }
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, 5);
}

function statusFor(matches) {
  if (!matches.length) return 'missing';
  const best = matches[0];
  if (['withdrawn', 'superseded', 'obsolete', 'inactive'].includes(String(best.standard.status || '').toLowerCase())) return 'outdated_reference';
  if (best.score >= 0.75 || best.source === 'explicit-reference') return 'matched';
  return 'partially_matched';
}
function explainMatch(source, score, standard) {
  const number = standard?.standardNumber || 'this registry standard';
  if (source === 'explicit-reference') return `The tender explicitly references ${number}; the registry contains a corresponding record.`;
  if (source === 'registry-keyword-match') return `The requirement shares relevant technical terms with ${number} in the Standards Registry. This is a registry keyword mapping, not proof that every tender detail is covered.`;
  if (source === 'vector-search') return `The requirement is semantically similar to the indexed evidence associated with ${number}. The score reflects retrieval relevance and does not establish regulatory applicability.`;
  return `The registry returned ${number} as relevant evidence for this requirement.`;
}

function riskFor(status, confidence, verified) {
  if (status === 'outdated_reference') return 'critical';
  if (status === 'missing') return 'high';
  if (status === 'partially_matched' || !verified) return 'medium';
  return confidence >= 0.8 ? 'low' : 'medium';
}

async function llmReview(text, requirements) {
  if (!llmConfig().configured) return null;
  const prompt = `You are a tender validation assistant. Use ONLY the supplied tender text. Do not invent Indian Standard numbers. Return JSON only: {"summary":"...","productName":"...","requirements":[{"text":"...","type":"technical|testing|safety|installation|certification|quality","requiredStandard":"..."}]}. Tender text:\n${String(text).slice(0, 18000)}\nInitial requirements:\n${JSON.stringify(requirements)}`;
  try { return await generateStructured(prompt); } catch { return null; }
}

export async function validateTender({ userId, documentId, title, text }) {
  let sourceText = clean(text); let document = null;
  if (documentId) {
    if (!mongoose.isValidObjectId(documentId)) throw Object.assign(new Error('Invalid document ID.'), { code: 'INVALID_DOCUMENT_ID' });
    document = await Document.findById(documentId);
    if (!document) throw Object.assign(new Error('Tender document not found.'), { code: 'DOCUMENT_NOT_FOUND' });
    if (String(document.documentType || '').toLowerCase() !== 'tender') {
      throw Object.assign(new Error('The selected document is not classified as a Tender. Choose a document marked as Tender in Documents.'), { code: 'NOT_A_TENDER_DOCUMENT_TYPE' });
    }
    sourceText = clean(document.extractedText);
    if (!sourceText) throw Object.assign(new Error('The selected document has no extracted text. Process the document before validation.'), { code: 'DOCUMENT_NOT_PROCESSED' });
  }
  if (!sourceText) throw Object.assign(new Error('Tender text or a processed document is required.'), { code: 'TENDER_TEXT_REQUIRED' });

  const relevance = isTenderLikeText(sourceText);
  if (!relevance.valid) {
    throw Object.assign(new Error(`${relevance.reason} Upload or submit an actual tender/procurement document.`), { code: 'NOT_A_TENDER_DOCUMENT' });
  }

  let initial = splitRequirements(sourceText);
  const llm = await llmReview(sourceText, initial);
  if (Array.isArray(llm?.requirements) && llm.requirements.length) initial = llm.requirements.map((r) => ({ text: clean(r.text), type: clean(r.type) || classify(r.text), requiredStandard: clean(r.requiredStandard) })).filter((r) => r.text.length >= 15).slice(0, MAX_REQUIREMENTS);
  const explicitRefs = extractExplicitStandards(sourceText);

  const tender = await Tender.create({ title: clean(title) || document?.originalName || 'Tender validation', documentId: document?._id || null, uploadedBy: userId, productName: clean(llm?.productName), summary: clean(llm?.summary) || `Validation generated from ${document?.originalName || 'submitted tender text'}`, validationStatus: 'not_started', report: { explicitStandards: explicitRefs, llmUsed: Boolean(llm) } });

  const created = []; const riskFlags = []; let matched = 0; let highRisk = 0;
  let requirementVectors = [];
  if (initial.length && embeddingConfig().configured) {
    try {
      requirementVectors = await embedTexts(initial.map((item) => item.text));
    } catch {
      requirementVectors = [];
    }
  }
  for (let index = 0; index < initial.length; index += 1) {
    const item = initial[index];
    const matches = await findMatches(item.text, explicitRefs, requirementVectors[index] || null);
    const best = matches[0];
    const status = item.requiredStandard && !matches.length ? 'missing' : statusFor(matches);
    const confidence = best ? Math.min(1, Math.max(0, best.score)) : 0;
    const verified = Boolean(best?.standard?.verified); const riskLevel = riskFor(status, confidence, verified);
    if (status === 'matched') matched += 1; if (riskLevel === 'high' || riskLevel === 'critical') highRisk += 1;
    const evidence = matches.slice(0, 3).map((m) => ({ standardId: String(m.standard._id), standardNumber: m.standard.standardNumber || null, title: m.standard.title, score: Number(m.score || 0), source: m.source, verified: Boolean(m.standard.verified), status: m.standard.status || null, sourceMetadata: m.standard.source || null, why: explainMatch(m.source, Number(m.score || 0), m.standard) }));
    const req = await TenderRequirement.create({ tenderId: tender._id, type: item.type || classify(item.text), text: item.text, requiredStandard: item.requiredStandard || '', matchedStandard: best?.standard?._id || null, matchedStandards: matches.map((m) => m.standard._id), status, confidence, evidence, sourceReference: document ? `Document: ${document.originalName}` : 'Submitted tender text', riskLevel });
    created.push(req);
    if (status === 'missing') riskFlags.push({ level: riskLevel, code: 'MISSING_STANDARD', message: 'No matching standard was found in the current registry.', requirementId: req._id });
    if (status === 'outdated_reference') riskFlags.push({ level: riskLevel, code: 'OUTDATED_STANDARD', message: 'The referenced or matched standard appears inactive or superseded in the registry.', requirementId: req._id });
    if (!verified && best) riskFlags.push({ level: 'medium', code: 'UNVERIFIED_SOURCE', message: 'The best matching standard is not marked as verified.', requirementId: req._id });
  }

  const recs = []; const seen = new Set();
  for (const req of created) for (const e of req.evidence || []) if (!seen.has(e.standardId) && e.score >= 0.55) { seen.add(e.standardId); recs.push(e); }
  const missing = created.filter((r) => r.status === 'missing'); const outdated = created.filter((r) => r.status === 'outdated_reference');
  const validationStatus = highRisk ? 'high_risk' : (missing.length || outdated.length ? 'needs_review' : 'validated');
  const report = { generatedAt: new Date().toISOString(), validationScope: 'standards_coverage', validationScopeLabel: 'Tender requirements mapped against the Standards Registry', requirementsAnalyzed: created.length, matchedRequirements: matched, stronglyMappedRequirements: matched, missingRequirements: missing.length, standardsCoverageGaps: missing.map((r) => ({ requirementId: String(r._id), text: r.text })), outdatedReferences: outdated.length, coverage: created.length ? Number((matched / created.length).toFixed(3)) : 0, explicitStandards: explicitRefs, complianceGaps: missing.map((r) => ({ requirementId: String(r._id), text: r.text })), outdatedStandards: outdated.map((r) => ({ requirementId: String(r._id), text: r.text, standard: r.evidence?.[0] || null })), recommendedStandards: recs.slice(0, 10), riskSummary: { highOrCritical: highRisk, medium: riskFlags.filter((x) => x.level === 'medium').length, totalFlags: riskFlags.length }, disclaimer: 'This validation measures standards coverage of tender requirements. It is not supplier compliance certification. Confirm current regulatory status, applicability, editions, amendments and evidence against authoritative sources before issuing or evaluating a tender.', llmUsed: Boolean(llm), llm: llmConfig() };
  tender.requirements = created.map((r) => r._id); tender.recommendedStandards = recs.slice(0, 10); tender.validationStatus = validationStatus; tender.report = report; tender.riskFlags = riskFlags; tender.validatedAt = new Date(); await tender.save();
  return { tender, requirements: created, report };
}

export async function getTender(id) {
  const tender = await Tender.findById(id).populate('uploadedBy', 'name email role').populate('documentId', 'originalName status embeddingStatus').populate('requirements');
  if (!tender) throw Object.assign(new Error('Tender not found.'), { code: 'TENDER_NOT_FOUND' }); return tender;
}
export async function listTenders(userId, role) { return Tender.find(role === 'admin' ? {} : { uploadedBy: userId }).sort({ createdAt: -1 }).limit(50).select('-report'); }
export async function revalidateTender(id, userId) {
  const tender = await Tender.findById(id); if (!tender) throw Object.assign(new Error('Tender not found.'), { code: 'TENDER_NOT_FOUND' });
  if (String(tender.uploadedBy) !== String(userId)) throw Object.assign(new Error('You can only revalidate your own tender.'), { code: 'FORBIDDEN' });
  if (!tender.documentId) throw Object.assign(new Error('Tender source document is unavailable.'), { code: 'DOCUMENT_NOT_FOUND' });
  return validateTender({ userId, documentId: tender.documentId, title: tender.title });
}
