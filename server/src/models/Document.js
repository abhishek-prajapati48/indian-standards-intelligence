import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  filename: { type: String, required: true },
  storageProvider: { type: String, enum: ['local', 'supabase'], default: 'local' },
  storagePath: { type: String, default: '' },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadDate: { type: Date, default: Date.now },
  documentType: { type: String, enum: ['standard', 'tender', 'guidance', 'other'], default: 'other', index: true },
  status: { type: String, enum: ['uploaded', 'processing', 'processed', 'failed'], default: 'uploaded', index: true },
  extractedText: { type: String, default: '' },
  chunkCount: { type: Number, default: 0 },
  processingStatus: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  source: { type: String, default: 'user-upload' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  standardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Standard', default: null },
  errorMessage: { type: String, default: '' },
  embeddingStatus: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending', index: true },
  embeddedChunkCount: { type: Number, default: 0 },
  embeddingModel: { type: String, default: '' },
  embeddingError: { type: String, default: '' }
}, { timestamps: true });

schema.index({ originalName: 'text', extractedText: 'text' });
schema.index({ standardId: 1, createdAt: -1 });

export default mongoose.model('Document', schema);
