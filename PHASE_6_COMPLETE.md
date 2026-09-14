# Phase 6 — RAG + AI Recommendation Engine

Implemented on top of Phase 5.

## Included
- Retrieval-Augmented Generation (RAG) service using MongoDB Vector Search evidence.
- Provider-abstracted LLM service with Gemini and Hugging Face options.
- Source/evidence constrained recommendation generation.
- Guardrails against fabricating Indian Standard numbers or regulatory facts.
- English/Hindi query detection and response preference.
- Recommendation persistence and per-user history.
- New Recommendations UI with AI answer, recommendations, evidence, confidence and verification notes.
- Existing Phase 1–5 routes remain available.

## API
- `POST /api/recommendations/generate`
- `POST /api/recommendations`
- `GET /api/recommendations`

## Environment
```env
LLM_PROVIDER=gemini
LLM_API_KEY=YOUR_PROVIDER_KEY
LLM_MODEL=gemini-2.5-flash
LLM_API_URL=
```

Hugging Face can be selected with `LLM_PROVIDER=huggingface` and a compatible text-generation model.

## Run
```bash
npm install
npm --prefix server install
npm --prefix client install
npm run dev
```

Then open `/recommendations`.
