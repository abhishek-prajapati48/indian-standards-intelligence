import mongoose from 'mongoose';

const amendmentSchema = new mongoose.Schema(
  {
    number: { type: String, trim: true },
    title: { type: String, trim: true },
    date: Date,
    description: { type: String, trim: true }
  },
  { _id: false }
);

const sourceSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    url: { type: String, trim: true },
    publisher: { type: String, trim: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' }
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    standardNumber: { type: String, trim: true, index: true },
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true, index: true },
    productCategory: { type: String, trim: true, index: true },
    keywords: [{ type: String, trim: true }],
    edition: { type: String, trim: true },
    publicationDate: Date,
    status: { type: String, trim: true, index: true, default: 'active' },
    amendments: [amendmentSchema],
    supersedes: { type: mongoose.Schema.Types.ObjectId, ref: 'Standard' },
    supersededBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Standard' },
    normativeReferences: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Standard' }],
    relatedStandards: [{ type: mongoose.Schema.Types.Mixed }],
    certificationRequirements: [{ type: String, trim: true }],
    testingRequirements: [{ type: String, trim: true }],
    safetyRequirements: [{ type: String, trim: true }],
    installationRequirements: [{ type: String, trim: true }],
    source: sourceSchema,
    verified: { type: Boolean, default: false, index: true },
    lastVerifiedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

schema.index({ standardNumber: 1, edition: 1 }, { unique: true, sparse: true });
schema.index({ title: 'text', description: 'text', keywords: 'text', standardNumber: 'text' });

export default mongoose.model('Standard', schema);
