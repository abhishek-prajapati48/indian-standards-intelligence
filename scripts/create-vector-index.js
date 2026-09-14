import dotenv from 'dotenv';
import mongoose from '../server/node_modules/mongoose/index.js';
dotenv.config({ path: new URL('../server/.env', import.meta.url) });
import { env } from '../server/src/config/env.js';

const collectionName = 'standardchunks';
const indexName = 'standard_chunks_vector_index';

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  const collection = mongoose.connection.collection(collectionName);
  const existing = await collection.listSearchIndexes(indexName).toArray();
  if (!existing.length) {
    const created = await collection.createSearchIndex({
      name: indexName,
      type: 'vectorSearch',
      definition: {
        fields: [
          { type: 'vector', path: 'embedding', numDimensions: 384, similarity: 'cosine' },
          { type: 'filter', path: 'standardId' }
        ]
      }
    });
    console.log(`Vector Search index creation started: ${created}`);
  } else {
    console.log(`Vector Search index already exists: ${indexName}`);
  }

  for (let attempt = 1; attempt <= 30; attempt += 1) {
    const indexes = await collection.listSearchIndexes(indexName).toArray();
    const current = indexes[0];
    console.log(`Index status: ${current?.status || 'unknown'}; queryable=${current?.queryable === true}`);
    if (current?.queryable === true) break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect().catch(() => {});
});
