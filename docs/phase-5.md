# Phase 5 — Embeddings + MongoDB Vector Search

Implemented:
- Provider-abstracted embedding service using Hugging Face Inference Providers.
- Multilingual `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` embeddings (384 dimensions).
- Automatic embedding after document processing.
- Manual/retry embedding endpoints for Admin and Procurement Officer.
- MongoDB Vector Search index creation script.
- Semantic search over document chunks with similarity scores and source metadata.
- Search UI updated to show semantic chunk evidence instead of fake/demo scores.

## Environment
Set in `server/.env`:

```env
EMBEDDING_PROVIDER=huggingface
EMBEDDING_API_KEY=hf_your_token_here
EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
```

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

## APIs

- `GET /api/embeddings/status` — admin/procurement officer
- `POST /api/embeddings/documents/:id` — admin/procurement officer
- `POST /api/embeddings/pending` — admin/procurement officer
- `POST /api/search/semantic` — authenticated application search

## Notes
The selected embedding model supports 50 languages and maps text into a 384-dimensional space. This is appropriate for the English/Hindi semantic-search foundation; later phases can add a stronger production embedding provider without changing the application-facing API.
