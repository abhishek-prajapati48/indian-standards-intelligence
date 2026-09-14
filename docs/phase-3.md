# Phase 3 — Standards Registry & Admin CRUD

Phase 3 builds the first real data-management module on top of the working Phase 2 authentication/RBAC foundation.

## Included

- Production-oriented `Standard` Mongoose schema with indexes and verification metadata.
- Public standards listing/detail endpoints with search, filters and pagination.
- Admin-only create, update and delete endpoints.
- Admin statistics and standards audit-log endpoints.
- Audit logging for standards create/update/delete operations.
- React Standards Registry UI with search/filter/pagination.
- Admin modal for creating/editing standard metadata.
- Standard detail page.
- Verification, source, requirements and relationship fields preserved for later RAG/tender phases.

## API

- `GET /api/standards`
- `GET /api/standards/:id`
- `POST /api/standards` — admin
- `PUT /api/standards/:id` — admin
- `DELETE /api/standards/:id` — admin
- `GET /api/admin/stats` — admin
- `GET /api/admin/audit-logs` — admin

## Data policy

Do not treat invented standard numbers as authoritative. Use verified/authorized source data for production ingestion. Demo records must be clearly marked as demo/non-official.
