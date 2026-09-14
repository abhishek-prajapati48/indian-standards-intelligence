import dotenv from 'dotenv';
import mongoose from '../server/node_modules/mongoose/index.js';
dotenv.config({ path: new URL('../server/.env', import.meta.url) });
import Document from '../server/src/models/Document.js';
import { env } from '../server/src/config/env.js';
import { embedDocument } from '../server/src/services/vector.service.js';

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  const allDocs = await Document.find({})
    .select('_id originalName status processingStatus embeddingStatus embeddedChunkCount chunkCount')
    .sort({ originalName: 1 });
  const docs = allDocs.filter((doc) => doc.processingStatus === 'completed'
    && ['pending', 'failed', undefined, null].includes(doc.embeddingStatus));

  const statusCounts = allDocs.reduce((counts, doc) => {
    const status = doc.embeddingStatus || 'pending';
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});

  console.log(`Documents: ${allDocs.length} total | pending: ${statusCounts.pending || 0} | embedded: ${statusCounts.completed || 0} | failed: ${statusCounts.failed || 0}`);
  for (const doc of allDocs) {
    const status = doc.embeddingStatus || 'pending';
    console.log(`- ${doc.originalName}: ${status} (${doc.embeddedChunkCount || 0}/${doc.chunkCount || 0} chunks, processing: ${doc.processingStatus || doc.status})`);
  }

  console.log(`Found ${docs.length} document(s) awaiting embeddings (including legacy documents without embeddingStatus).`);
  for (const doc of docs) {
    try {
      const result = await embedDocument(doc._id);
      console.log(`Embedded ${doc.originalName}: ${result.embeddedChunkCount} chunks`);
    } catch (error) {
      console.error(`Failed ${doc.originalName}: ${error.message}`);
    }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect().catch(() => {}); });
