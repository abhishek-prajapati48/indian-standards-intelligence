import mongoose from 'mongoose';
import Document from '../models/Document.js';
import StandardChunk from '../models/StandardChunk.js';
import { embedTexts, embeddingConfig } from './embedding.service.js';

export async function embedDocument(documentId) {
  const document = await Document.findById(documentId);
  if (!document) throw new Error('Document not found.');

  const chunks = await StandardChunk.find({ documentId }).sort({ chunkIndex: 1 });
  if (!chunks.length) throw new Error('No chunks are available for embedding.');

  document.embeddingStatus = 'processing';
  document.embeddingError = '';
  await document.save();

  try {
    const vectors = await embedTexts(chunks.map((chunk) => chunk.text));
    if (vectors.length !== chunks.length) throw new Error('Embedding count does not match chunk count.');

    const ops = chunks.map((chunk, index) => ({
      updateOne: {
        filter: { _id: chunk._id },
        update: {
          $set: {
            embedding: vectors[index],
            embeddingModel: embeddingConfig().model,
            embeddedAt: new Date()
          }
        }
      }
    }));
    await StandardChunk.bulkWrite(ops);

    document.embeddingStatus = 'completed';
    document.embeddedChunkCount = vectors.length;
    document.embeddingModel = embeddingConfig().model;
    document.embeddingError = '';
    await document.save();
    return { documentId, embeddedChunkCount: vectors.length, model: embeddingConfig().model };
  } catch (error) {
    document.embeddingStatus = 'failed';
    document.embeddingError = error.message;
    await document.save();
    throw error;
  }
}

export async function semanticVectorSearchByVector({ queryVector, limit = 8, standardId = null }) {
  if (!Array.isArray(queryVector) || queryVector.length !== 384) {
    throw new Error('A 384-dimensional query vector is required for semantic search.');
  }
  const safeLimit = Math.min(Math.max(Number(limit) || 8, 1), 20);
  const pipeline = [
    {
      $vectorSearch: {
        index: 'standard_chunks_vector_index',
        path: 'embedding',
        queryVector,
        numCandidates: Math.max(safeLimit * 10, 50),
        limit: safeLimit,
        ...(standardId && mongoose.isValidObjectId(standardId) ? { filter: { standardId: new mongoose.Types.ObjectId(standardId) } } : {})
      }
    },
    {
      $project: {
        text: 1,
        chunkIndex: 1,
        documentId: 1,
        standardId: 1,
        metadata: 1,
        score: { $meta: 'vectorSearchScore' }
      }
    }
  ];
  return StandardChunk.aggregate(pipeline);
}

export async function semanticVectorSearch({ query, limit = 8, standardId = null }) {
  const vector = await embedTexts([query]);
  return semanticVectorSearchByVector({ queryVector: vector[0], limit, standardId });
}
