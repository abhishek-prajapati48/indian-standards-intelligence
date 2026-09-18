# Phase 11 — Docker

## Completed

- Production-oriented backend Docker image using Node 22.
- Installs `poppler-utils` so PDF extraction works inside the container.
- Uses `npm ci --omit=dev` and runs the backend with `node src/server.js`.
- Persistent Docker volume for uploaded documents.
- Production frontend image: Vite build + Nginx.
- Nginx serves the React SPA and reverse-proxies `/api/` to the backend.
- Docker Compose includes MongoDB with a health check.
- Backend and frontend health-aware startup dependencies.
- Configurable environment variables through `.env` / Compose interpolation.
- `.dockerignore` prevents secrets, local dependencies, builds, and uploads from entering images.

## Important Atlas note

The bundled MongoDB container is useful for local Docker testing. MongoDB Vector Search used by the AI recommendation/search pipeline requires the Atlas vector-search deployment already configured in earlier phases. Set `MONGODB_URI` to the working Atlas connection string when running the complete AI stack.

## Local Docker run

1. Copy `.env.docker.example` to `.env`.
2. For a local-only stack, keep the local MongoDB URI and use a strong JWT secret anyway.
3. For the complete application, replace `MONGODB_URI` with the working MongoDB Atlas URI and provide the AI provider keys.
4. Run `docker compose up --build`.
5. Open `http://localhost:5173`.
6. Backend health: `http://localhost:5000/api/health`.

## Stop

`docker compose down`

Data volumes remain unless removed explicitly.
