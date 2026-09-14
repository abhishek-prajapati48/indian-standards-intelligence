FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

# PDF text extraction used by the document-processing pipeline.
RUN apt-get update \
    && apt-get install -y --no-install-recommends poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY server/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server/ ./
RUN mkdir -p /app/uploads

EXPOSE 5000

USER node
CMD ["node", "src/server.js"]
