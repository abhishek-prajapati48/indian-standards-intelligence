# Phase 5 Complete — Embeddings + MongoDB Vector Search

Phase 5 adds real semantic retrieval to the Phase 4 document pipeline.

## Included
- 384-dimensional multilingual embeddings.
- Automatic embedding after document processing.
- Embedding status and failure diagnostics.
- MongoDB Vector Search index definition and creation script.
- Semantic search API using `$vectorSearch`.
- Search UI with similarity score, snippets, and verification state.
- Retry/batch indexing scripts.

## Before testing
1. Configure `EMBEDDING_API_KEY` in `server/.env`.
2. Create the Atlas Vector Search index with `npm run vector-index`.
3. Reprocess or upload a document; it should become `embeddingStatus=completed`.
4. Search from `/search`.

## Important
The embedding provider is external and has its own usage limits. Keep the key server-side and never put it in the React client.


## Legacy document compatibility fix
The embedding indexer now includes completed documents created before Phase 5 that do not yet have `embeddingStatus`. A `backfill-embeddings` script is also provided.
