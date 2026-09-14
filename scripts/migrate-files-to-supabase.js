import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { connectDB } from '../server/src/config/database.js';
import { env } from '../server/src/config/env.js';
import Document from '../server/src/models/Document.js';
import { storagePathFor, uploadFile } from '../server/src/services/storage.service.js';

if (env.STORAGE_PROVIDER !== 'supabase') {
  throw new Error('Set STORAGE_PROVIDER=supabase before running this migration.');
}

const connected = await connectDB();
if (!connected) throw new Error('MongoDB connection failed.');

const docs = await Document.find({ $or: [{ storageProvider: { $ne: 'supabase' } }, { storagePath: '' }] });
console.log(`Found ${docs.length} document(s) to migrate.`);

for (const doc of docs) {
  const localPath = path.resolve(env.UPLOAD_DIR, doc.filename);
  try {
    await fs.access(localPath);
    const storagePath = storagePathFor(doc.filename);
    await uploadFile(localPath, storagePath, doc.mimeType);
    doc.storageProvider = 'supabase';
    doc.storagePath = storagePath;
    doc.metadata = { ...(doc.metadata || {}), migratedToSupabaseAt: new Date().toISOString() };
    await doc.save();
    console.log(`Migrated: ${doc.originalName}`);
  } catch (error) {
    console.error(`Skipped ${doc.originalName}: ${error.message}`);
  }
}

await mongoose.connection.close();
