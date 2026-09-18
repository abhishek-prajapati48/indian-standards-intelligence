# Phase 7 Complete — Tender Validation

Built directly on the user's working Phase 6 project. No Phase 5.1 intermediate release was introduced.

## Included
- Tender Validation workspace for Admin and Procurement Officer.
- Validate a processed uploaded document or paste tender text.
- Requirement extraction with deterministic fallback and optional configured LLM refinement.
- Explicit IS / ISO / IEC reference detection.
- Standard Registry matching using explicit references, registry keyword matching and MongoDB Vector Search when available.
- Requirement statuses: matched, partially matched, missing, outdated reference, review.
- Compliance gap detection and coverage metrics.
- Risk flags for missing standards, outdated references and unverified metadata.
- Persisted Tender and TenderRequirement records.
- Saved validation history and detailed report view.
- Audit logging for validation and revalidation.
- Existing Phase 1–6 functionality preserved.

## API
- `GET /api/tenders`
- `GET /api/tenders/:id`
- `POST /api/tenders/validate`
- `POST /api/tenders/:id/revalidate`

## Validation input
Use either a processed document:
```json
{"documentId":"<processed Document ObjectId>","title":"Optional tender title"}
```
or direct text:
```json
{"text":"Tender requirement text...","title":"Optional tender title"}
```

## Important data policy
The validator does not invent Indian Standard numbers. Registry matches are decision-support evidence; current regulatory status and applicability must be confirmed against authoritative sources.
