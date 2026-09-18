# Phase 9 — Admin / Advanced Analytics

Implemented on top of the working Phase 8 project.

## Features
- Admin-only advanced analytics dashboard
- User role and active/inactive distribution
- Document processing and embedding health analytics
- Tender validation and risk analytics
- Recommendation verification analytics
- Standards status analytics
- Audit action analytics
- Admin user search/filtering
- Admin role management
- Admin account activation/deactivation with self-deactivation protection
- Filterable audit trail
- Existing standards statistics and audit endpoints preserved
- Existing Phase 1–8 functionality preserved

## APIs
- `GET /api/admin/stats`
- `GET /api/admin/analytics`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id`
- `GET /api/admin/audit-logs`

All Phase 9 admin endpoints require an authenticated `admin` role.
