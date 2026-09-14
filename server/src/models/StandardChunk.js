import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  standardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Standard', index: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', index: true },
  text: { type: String, required: true },
  chunkIndex: { type: Number, required: true },
  embedding: { type: [Number], default: [] },
  embeddingModel: { type: String, default: '' },
  embeddedAt: { type: Date, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

schema.index({ documentId: 1, chunkIndex: 1 }, { unique: true });

export default mongoose.model('StandardChunk', schema);
