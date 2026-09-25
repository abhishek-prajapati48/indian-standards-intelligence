# AI-Based Indian Standards Recommendation Engine and Tender Validation System

Phase 1 foundation for the Smart India Hackathon project.

## Stack

- Frontend: React, Vite, Tailwind CSS, React Router, Axios
- Backend: Node.js, Express, JWT foundation, RBAC foundation
- Database: MongoDB / MongoDB Atlas
- AI foundation: provider-agnostic RAG/embedding structure
- Deployment: Docker / Docker Compose ready

## Prerequisites

- Node.js 20+
- npm
- Git
- MongoDB local or MongoDB Atlas
- Docker Desktop (optional)

## Run locally

From the project root:

```bash
npm install
cd client && npm install
cd ../server && npm install
cd ..
npm run dev
```

Open:

- Frontend: https://indian-standards-intelligence.onrender.com/
- Backend: https://indian-standards-intelligence.vercel.app/login
- Health: https://indian-standards-intelligence.onrender.com/api/health

## MongoDB

Create `server/.env` by copying the root `.env.example` values or create it manually.

For local MongoDB:

```env
MONGODB_URI=mongodb://localhost:27017/indian_standards_intelligence
```

For MongoDB Atlas, replace the value with your Atlas connection string.

**The API intentionally starts even when MongoDB is unavailable.** In that situation `/api/health` remains available and reports `database.connected: false`. The server retries the database connection periodically.

## Docker

```bash
docker compose up --build
```

Stop:

```bash
docker compose down
```

## Current phase

Phase 1 establishes the runnable monorepo, frontend, Express API, health endpoint, database connection handling, security middleware, models foundation, AI/RAG folders, Docker files and documentation.

Later phases implement document processing, embeddings/vector search, RAG recommendations, tender validation, dashboard analytics, testing and deployment. Phase 3 implements the Standards Registry, admin CRUD, verification metadata, search/filter/pagination and audit logging. Phase 4 now implements authenticated document upload, text extraction, chunking, document inspection, reprocessing and audit logging.

## Data policy

Do not seed invented Indian Standard numbers as authoritative data. Demo records must be explicitly labeled as demo/non-official. Production ingestion should use verified authorized sources.

## Phase 2 — Authentication

Authentication now includes registration, login, JWT access tokens, `/api/auth/me`, logout, protected frontend routes, and role-aware backend middleware. Public registration cannot create an admin account.

### Create an admin (MongoDB required)

Set optional variables in your shell or `.env`:

```env
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=ChangeMe123!
```

Then run:

```bash
npm run seed
```
## Phase 3 — Standards Registry

The current release adds the Standards Registry and admin data-management layer on top of Phase 2 authentication/RBAC.

### Run Phase 3

```bash
npm install
npm --prefix client install
npm --prefix server install
npm run dev
```

Open `http://localhost:5173` and sign in with your Phase 2 account.

### Admin features

Admin users can open **Standards Registry** and use **Add Standard**, **Edit**, and **Delete**. The **Admin Overview** page shows registry statistics and standards audit activity.

### Important

Keep your existing `server/.env` with the working MongoDB Atlas URI and JWT configuration. Do not commit or share it publicly.


## Phase 4 — Document Ingestion

The current release adds the Documents module on top of the Phase 3 registry. Admins and procurement officers can upload supported source documents; the server extracts text, chunks it, stores `StandardChunk` records and exposes processing status. PDF extraction uses the host `pdftotext` command.

Supported formats: PDF, TXT, Markdown, CSV, JSON and XML.

### Document API

- `GET /api/documents`
- `GET /api/documents/:id`
- `POST /api/documents` — admin/procurement_officer
- `POST /api/documents/:id/reprocess` — admin/procurement_officer
- `DELETE /api/documents/:id` — admin



## Phase 5 — Embeddings and Vector Search

Phase 5 uses a server-side Hugging Face embedding provider and MongoDB Atlas Vector Search. Configure `EMBEDDING_API_KEY`, run `npm run vector-index`, then `npm run embed` for existing processed documents. New documents automatically attempt embedding after text chunking.

## Phase 6 — RAG + AI Recommendation Engine
The `/recommendations` module retrieves semantically relevant document chunks, enriches them with Standard/document metadata, and asks a configured LLM to synthesize a source-backed recommendation. The prompt explicitly prohibits invented IS numbers or regulatory facts. Configure `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, and optionally `LLM_API_URL` in `server/.env`.

## Phase 7 — Tender Validation
The Tender Validation module checks tender requirements against the Standards Registry and indexed evidence. Procurement Officers and Admins can select a processed document from Documents or paste tender text. The validator detects explicit IS/ISO/IEC references, extracts requirements, matches available standards, identifies missing/outdated references, calculates coverage, and produces risk flags and a saved validation report.

Open `/tenders` after starting the application.


## Phase 8
Admin / Advanced Analytics is implemented in the `/admin` route with governance metrics, user access management, embedding/tender analytics, and audit filtering.



### Phase 9 security

The current build includes Helmet, request IDs, global/auth/upload rate limits, strict Zod request validation, escaped search regexes, bounded pagination and AI inputs, PDF magic-byte validation, current-user checks on authenticated requests, production-safe error responses, and automated server security tests. See `PHASE_10_COMPLETE.md`.



## file structure
```
indian-standards-intelligence/
│
├── client/                              # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   └── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Standards.jsx
│   │   │   ├── StandardDetail.jsx
│   │   │   ├── Recommendations.jsx
│   │   │   ├── TenderValidation.jsx
│   │   │   ├── Documents.jsx
│   │   │   └── Admin.jsx
│   │   │
│   │   ├── routes/
│   │   │   └── ProtectedRoute.jsx
│   │   │
│   │   ├── services/
│   │   │   └── api.js
│   │   │
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── index.html
│   ├── vite.config.js
│   ├── vercel.json
│   ├── package.json
│   └── package-lock.json
│
├── server/                              # Node.js + Express Backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   └── env.js
│   │   │
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── standards.controller.js
│   │   │   ├── search.controller.js
│   │   │   ├── documents.controller.js
│   │   │   ├── tenders.controller.js
│   │   │   ├── recommendations.controller.js
│   │   │   ├── embeddings.controller.js
│   │   │   └── dashboard.controller.js
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js
│   │   │   ├── role.middleware.js
│   │   │   ├── validate.middleware.js
│   │   │   ├── rateLimit.middleware.js
│   │   │   ├── requestId.middleware.js
│   │   │   └── error.middleware.js
│   │   │
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Standard.js
│   │   │   ├── StandardChunk.js
│   │   │   ├── Document.js
│   │   │   ├── Tender.js
│   │   │   ├── TenderRequirement.js
│   │   │   ├── Recommendation.js
│   │   │   └── AuditLog.js
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── standards.routes.js
│   │   │   ├── search.routes.js
│   │   │   ├── documents.routes.js
│   │   │   ├── tenders.routes.js
│   │   │   ├── recommendations.routes.js
│   │   │   ├── embeddings.routes.js
│   │   │   ├── dashboard.routes.js
│   │   │   ├── admin.routes.js
│   │   │   ├── protected.routes.js
│   │   │   └── placeholder.routes.js
│   │   │
│   │   ├── services/
│   │   │   ├── document.service.js
│   │   │   ├── tender.service.js
│   │   │   ├── embedding.service.js
│   │   │   ├── vector.service.js
│   │   │   ├── rag.service.js
│   │   │   ├── llm.service.js
│   │   │   └── storage.service.js
│   │   │
│   │   ├── utils/
│   │   │   ├── ApiError.js
│   │   │   ├── asyncHandler.js
│   │   │   ├── response.js
│   │   │   └── security.js
│   │   │
│   │   ├── app.js
│   │   └── server.js
│   │
│   ├── test/
│   │   ├── embedding.test.js
│   │   ├── security.test.js
│   │   └── tender-relevance.test.js
│   │
│   ├── tests/
│   │   └── embedding.test.js
│   │
│   ├── package.json
│   └── package-lock.json
│
├── ai/
│   └── index.js
│
├── shared/
│   └── constants.js
│
├── scripts/
│   ├── seed.js
│   ├── index-documents.js
│   ├── classify-documents.js
│   ├── create-vector-index.js
│   ├── backfill-embedding-status.js
│   ├── migrate-files-to-supabase.js
│   └── seed-refrigerator-demo-standards.js
│
├── demo/
│   ├── demo_standards.json
│   ├── Lab_Refrigerator_Tender_Validation_Test.pdf
│   ├── BIS_Refrigerator_Validation_Demo_Data.pdf
│   └── README.md
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── database.md
│   ├── ai-pipeline.md
│   ├── tender-validation-architecture.md
│   ├── deployment.md
│   ├── deployment-phase12.md
│   ├── refrigerator-validation-demo.md
│   └── phase-3.md
│
├── docker/
│   ├── server.Dockerfile
│   ├── client.Dockerfile
│   └── nginx.conf
│
├── docker-compose.yml
├── render.yaml
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```
