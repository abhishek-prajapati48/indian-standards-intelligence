# API
Authentication: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me. Standards: GET/POST/PUT/DELETE /api/standards. Search: POST /api/search and /api/search/semantic. Additional endpoints are reserved for upcoming phases.

Phase 3 admin: GET /api/admin/stats and GET /api/admin/audit-logs (admin JWT required).

## Phase 5 Semantic APIs

`GET /api/embeddings/status` — Admin/Procurement Officer embedding status.

`POST /api/embeddings/documents/:id` — Embed/re-embed one processed document.

`POST /api/embeddings/pending` — Batch embed pending/failed processed documents.

`POST /api/search/semantic` — Semantic search. Body: `{ "query": "...", "limit": 8, "filters": { "standardId": "optional ObjectId" } }`.
