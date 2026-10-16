import dotenv from 'dotenv';
import mongoose from '../server/node_modules/mongoose/index.js';
dotenv.config({ path: new URL('../server/.env', import.meta.url) });
import Document from '../server/src/models/Document.js';
import { env } from '../server/src/config/env.js';
import { embeddingConfig } from '../server/src/services/embedding.service.js';
import { embedDocument } from '../server/src/services/vector.service.js';

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  const documents = await Document.find({
    processingStatus: 'completed',
    chunkCount: { $gt: 0 }
  }).select('_id originalName');
  let failures = 0;

  console.log(`Re-embedding ${documents.length} processed documents with ${embeddingConfig().provider}/${embeddingConfig().model}.`);
  for (const document of documents) {
    try {
      const result = await embedDocument(document._id);
      console.log(`Embedded ${document.originalName}: ${result.embeddedChunkCount} chunks`);
    } catch (error) {
      failures += 1;
      console.error(`Failed ${document.originalName}: ${error.message}`);
    }
  }

  console.log(`Re-embedding complete: ${documents.length - failures} succeeded, ${failures} failed.`);
  if (failures) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
