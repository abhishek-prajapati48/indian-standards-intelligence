import mongoose from '../server/node_modules/mongoose/index.js';
import Document from '../server/src/models/Document.js';
import { env } from '../server/src/config/env.js';

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  const result = await Document.updateMany(
    { processingStatus: 'completed', $or: [{ embeddingStatus: { $exists: false } }, { embeddingStatus: null }] },
    { $set: { embeddingStatus: 'pending', embeddedChunkCount: 0, embeddingError: '' } }
  );
  console.log(`Marked ${result.modifiedCount} legacy completed document(s) as pending for embeddings.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect().catch(() => {}); });
