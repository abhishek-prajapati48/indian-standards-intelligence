# Phase 12 — Free Deployment

## Target architecture

- **Frontend:** Vercel static deployment of `client/`
- **Backend:** Render Free Web Service using `docker/server.Dockerfile`
- **Database:** existing MongoDB Atlas cluster with MongoDB Vector Search
- **Document storage:** Supabase Storage bucket named `documents`
- **AI:** existing Gemini LLM + Hugging Face embeddings

This architecture avoids relying on Render's local filesystem for uploaded documents. The backend downloads a document to a temporary runtime directory for PDF/text extraction, then removes the temporary copy. The durable document remains in Supabase Storage.

## 1. MongoDB Atlas

Keep the existing Atlas database and Vector Search index. Do not use the local Docker MongoDB for the public deployment.

Required values:
- `MONGODB_URI`
- Atlas network access allowing the deployed backend to connect
- existing `standardchunks` vector index `standard_chunks_vector_index`

## 2. Supabase Storage

Create a Supabase project and a private Storage bucket named `documents`.

The backend uses the Supabase service-role key server-side only. Never expose that key to the React client.

Required environment variables:
- `STORAGE_PROVIDER=supabase`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET=documents`

If existing local uploads must be retained, run from the project root before switching off local storage:

```bash
STORAGE_PROVIDER=supabase npm run migrate-storage
```

The migration uploads files referenced by MongoDB documents and records their Supabase storage path.

## 3. Deploy backend to Render

Create a Render Blueprint from `render.yaml`, or create a Docker Web Service manually.

Dockerfile:
- `./docker/server.Dockerfile`
- build context: repository root

Set the environment variables marked `sync: false` in `render.yaml`.

Important values:
- `MONGODB_URI` = existing Atlas URI
- `CLIENT_URL` = final Vercel frontend URL
- `JWT_SECRET` = strong random secret, at least 32 characters
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LLM_API_KEY`
- `EMBEDDING_API_KEY`

The service health path is `/api/health`.

## 4. Deploy frontend to Vercel

Import the repository into Vercel and set **Root Directory** to `client/`.

Build command:

```bash
npm run build
```

Output directory:

```text
dist
```

Set this Vercel environment variable:

```text
VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api
```

`client/vercel.json` keeps React Router routes working on direct navigation.

After the first deployment, copy the real Vercel URL into Render's `CLIENT_URL` and redeploy the backend.

## 5. Production checklist

- [ ] Atlas connection works from Render
- [ ] Atlas Vector Search index is READY
- [ ] Supabase `documents` bucket exists
- [ ] Supabase service-role key is only on Render
- [ ] Gemini API key is only on Render
- [ ] Hugging Face token is only on Render
- [ ] `JWT_SECRET` is strong and unique
- [ ] Vercel `VITE_API_URL` points to Render `/api`
- [ ] Render `CLIENT_URL` points to Vercel origin
- [ ] Admin login works
- [ ] Document upload persists after a backend restart
- [ ] PDF processing works
- [ ] Embeddings complete
- [ ] Semantic search works
- [ ] Recommendations work
- [ ] Tender validation works
- [ ] Admin analytics works
- [ ] Non-admin RBAC remains blocked

## Free-tier limitations

Free hosting is appropriate for a hackathon/demo deployment, not a production SLA. Render free web services can spin down after inactivity, so the first request after idle may be slow. Supabase Free provides 1 GB file storage, and MongoDB Atlas Free provides a small shared cluster suitable for development/small demonstrations.
