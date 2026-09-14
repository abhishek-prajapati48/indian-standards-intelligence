# Phase 4 — Document Ingestion & Processing

Phase 4 turns the existing Documents placeholder into a working authenticated document-ingestion module.

## Included

- Authenticated document upload for admins and procurement officers.
- PDF, TXT, Markdown, CSV, JSON and XML support.
- Safe randomized stored filenames.
- Configurable upload size using `MAX_FILE_SIZE`.
- PDF text extraction using the system `pdftotext` utility.
- Plain-text extraction for supported text formats.
- Automatic text chunking with overlap.
- `StandardChunk` records prepared for the later embedding/vector-search phase.
- Optional linking of a document to an existing Standard by MongoDB ObjectId.
- Document list, processing status, chunk counts and source metadata.
- Document detail view with extracted text and chunks.
- Reprocessing action for admins/procurement officers.
- Admin-only deletion with cleanup of stored file and chunks.
- Audit logging for create/reprocess/delete.

## API

- `GET /api/documents`
- `GET /api/documents/:id`
- `POST /api/documents` — admin/procurement_officer, multipart field `file`, optional `standardId`
- `POST /api/documents/:id/reprocess` — admin/procurement_officer
- `DELETE /api/documents/:id` — admin

## Notes

This phase deliberately does not invent embeddings or claim semantic/vector search is complete. Chunks are stored with an empty `embedding` array so Phase 5/6 can add a real embedding provider and vector index without redesigning the ingestion flow.

PDF extraction requires `pdftotext` to be installed on the host. On Linux, install the package that provides the `pdftotext` command if it is missing.
