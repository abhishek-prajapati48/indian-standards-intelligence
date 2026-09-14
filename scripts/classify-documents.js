import mongoose from 'mongoose';
import { env } from '../server/src/config/env.js';
import Document from '../server/src/models/Document.js';
import Standard from '../server/src/models/Standard.js';
import { isTenderLikeText } from '../server/src/services/tender.service.js';

await mongoose.connect(env.MONGODB_URI);
const docs = await Document.find({ $or: [{ documentType: { $exists: false } }, { documentType: null }] });
let updated = 0;
for (const doc of docs) {
  let type = doc.standardId ? 'standard' : 'other';
  if (!doc.standardId && doc.extractedText) {
    const relevance = isTenderLikeText(doc.extractedText);
    if (relevance.valid) type = 'tender';
  }
  doc.documentType = type;
  await doc.save();
  updated += 1;
  console.log(`${doc.originalName}: ${type}`);
}
await mongoose.disconnect();
console.log(`Classified ${updated} legacy documents.`);
