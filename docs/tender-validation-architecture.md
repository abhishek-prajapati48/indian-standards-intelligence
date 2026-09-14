# Tender Validation Architecture

## Purpose
Tender Validation checks **standards coverage of tender requirements**. It does not certify supplier compliance.

## Stage 1 — Tender standards coverage
1. Accept a processed document classified as `tender` or submitted tender text.
2. Extract procurement/technical/testing/safety/certification requirements.
3. Detect explicit IS/ISO/IEC references written in the tender.
4. Search the verified Standards Registry using explicit references, registry keywords and semantic/vector retrieval.
5. Store the best registry evidence, match basis, score, verification status and explanation.
6. Classify each requirement as strongly mapped, partially mapped, standards gap or outdated reference.
7. Calculate standards coverage and review flags.

## Match basis
- **Explicit tender reference** — the tender itself names the standard.
- **Registry keyword match** — relevant terms overlap with registry metadata.
- **Semantic / vector match** — embedding retrieval finds semantically similar indexed evidence.

A match score is a retrieval/relevance signal. It is not a legal applicability determination and does not prove supplier conformity.

## Stage 2 — Supplier compliance (separate workflow)
A future supplier-compliance workflow can compare tender requirements with bidder evidence such as technical datasheets, certificates, test reports and compliance statements. It should return `Compliant`, `Non-Compliant` or `Insufficient Evidence`, with evidence references.

## Safety principle
The system must not fabricate Indian Standard numbers or claim that a standard is applicable/current without verified registry evidence.
