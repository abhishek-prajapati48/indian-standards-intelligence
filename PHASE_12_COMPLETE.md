# Phase 12 — Free Deployment Complete

This phase prepares the Standards Intelligence platform for a free public deployment using:

- Vercel for the React/Vite frontend
- Render Free Web Service for the Express backend using the existing Docker image
- MongoDB Atlas for MongoDB + Vector Search
- Supabase Storage for persistent document files
- Gemini + Hugging Face for AI services

## Key production change

Uploaded documents are no longer dependent on a local/ephemeral server filesystem when `STORAGE_PROVIDER=supabase`. The backend stores the durable file in Supabase Storage and downloads it to a temporary directory only while extracting text. This makes the document-processing pipeline compatible with ephemeral cloud instances.

## Deployment files

- `render.yaml`
- `client/vercel.json`
- `client/.env.production.example`
- `docs/deployment-phase12.md`
- `scripts/migrate-files-to-supabase.js`

## Local Docker compatibility

The default storage provider remains `local`, so Phase 11 Docker development continues to work without Supabase. Set `STORAGE_PROVIDER=supabase` only for the public deployment.
