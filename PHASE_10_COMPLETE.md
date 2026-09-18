# Phase 10 — Testing & Security

This phase hardens the working Phase 9 Admin / Advanced Analytics build without changing the established product roadmap.

## Security hardening

- Helmet security headers remain enabled and are applied before API routes.
- `X-Request-ID` is generated/validated for request tracing.
- API rate limiting is enabled globally, with stricter limits for authentication and document uploads.
- JWT verification is restricted to `HS256` and bounded token sizes.
- Every authenticated request re-checks the current MongoDB user account, so deactivation and role changes take effect immediately instead of waiting for an old token to expire.
- Production startup rejects weak/missing `JWT_SECRET` values; production requires at least 32 characters.
- Registration and login payloads use strict Zod schemas with length/type constraints.
- Recommendation and tender-validation payloads use strict Zod schemas and bounded input sizes.
- Admin user-update payloads use strict validation.
- Search regex input is escaped to prevent regex injection / pathological patterns.
- Pagination values are clamped to safe ranges.
- Uploaded PDFs are checked for `%PDF-` magic bytes after upload; extension/MIME alone is not trusted.
- Oversized and malformed multipart requests receive controlled errors.
- API 404 responses are normalized.
- Production 5xx responses do not expose internal exception messages.
- Existing RBAC is preserved and enforced at the API route level.

## Automated tests

`npm test --prefix server` verifies:

- embedding provider contract
- document chunk word-boundary behavior
- regex/pagination security helpers
- RBAC denial behavior
- security headers
- request ID propagation
- controlled API 404 handling
- missing authentication rejection
- rejection of non-HS256 JWT algorithms

Final local test result: **8/8 passed**.

## Frontend verification

Production frontend build completed successfully with Vite.

## Manual security acceptance tests

Before Phase 11, verify in the running application:

1. Deactivate a user in Admin and confirm their existing session/token can no longer access protected APIs.
2. Change a user's role and confirm the new role is enforced without waiting for token expiry.
3. Confirm Viewer/Supplier/Procurement Officer cannot access `/api/admin/*`.
4. Attempt an oversized upload and confirm a controlled `413 FILE_TOO_LARGE` response.
5. Attempt to upload a fake PDF containing plain text and confirm `INVALID_FILE_CONTENT`.
6. Submit malformed/unknown JSON fields to strict validation endpoints and confirm `VALIDATION_ERROR`.
7. Confirm repeated login attempts eventually receive `429 RATE_LIMITED`.
8. Confirm production deployment uses a strong secret and does not expose internal stack traces.

## Important production note

Phase 4–10 still use the existing local filesystem upload implementation. Do **not** treat the local upload directory as durable production storage on an ephemeral hosting service. Phase 12 deployment should migrate uploaded documents to persistent object storage before production deployment.

### Tender-source relevance hardening
Tender validation now verifies that the supplied document/text contains sufficient tender/procurement signals before any LLM, registry matching, or validation record is created. Resume/CV/job-application style documents are explicitly rejected with `NOT_A_TENDER_DOCUMENT` (HTTP 422).
