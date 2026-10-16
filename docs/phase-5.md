# Phase 5 — Embeddings + MongoDB Vector Search

Implemented:
- Gemini `gemini-embedding-001` embeddings (384 dimensions).
- Distinct retrieval-document and retrieval-query task types for vector indexing and search.
- Automatic embedding after document processing.
- Manual/retry embedding endpoints for Admin and Procurement Officer.
- MongoDB Vector Search index creation script.
- Semantic search over document chunks with similarity scores and source metadata.
- Search UI updated to show semantic chunk evidence instead of fake/demo scores.

## Environment
Set in `server/.env`:

```env
EMBEDDING_PROVIDER=gemini
EMBEDDING_MODEL=gemini-embedding-001
# Optional when GEMINI_API_KEY or LLM_API_KEY is already configured:
EMBEDDING_API_KEY=your_gemini_api_key
```

Gemini embeddings request 384 output dimensions, matching the Atlas Vector Search index. The embedding key falls back to `GEMINI_API_KEY` and then `LLM_API_KEY`.

## Setup

```bash
npm install
npm --prefix server install
npm --prefix client install
npm run vector-index
npm run embed
npm run dev
```

The vector index must be Ready in MongoDB Atlas before semantic queries can return results.

When switching from another embedding model, regenerate every document vector before relying on semantic results:

```bash
npm run reindex-embeddings
```

The script re-embeds all processed documents, including those already marked completed. Vectors from different models are not compatible, even when both models output 384 dimensions.

## APIs

- `GET /api/embeddings/status` — admin/procurement officer
- `POST /api/embeddings/documents/:id` — admin/procurement officer
- `POST /api/embeddings/pending` — admin/procurement officer
- `POST /api/search/semantic` — authenticated application search

## Notes
The Gemini embedding model supports multilingual retrieval and maps text into a 384-dimensional space for the existing Atlas index. Reindex all stored chunks after changing embedding models.
