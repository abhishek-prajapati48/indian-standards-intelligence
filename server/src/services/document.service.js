import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import mongoose from 'mongoose';
import Document from '../models/Document.js';
import StandardChunk from '../models/StandardChunk.js';
import { env } from '../config/env.js';
import { downloadToTemp } from './storage.service.js';

const TEXT_MIMES = new Set([
  'text/plain', 'text/markdown', 'text/csv', 'application/json',
  'application/xml', 'text/xml'
]);

export function chunkText(text, maxChars = 1600, overlap = 180) {
  const normalized = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const chunks = [];
  let current = '';

  const pushCurrent = () => {
    if (!current) return;
    chunks.push(current.trim());
    current = '';
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxChars) {
      if (!current) {
        current = paragraph;
      } else if (current.length + 2 + paragraph.length <= maxChars) {
        current += `\n\n${paragraph}`;
      } else {
        pushCurrent();
        current = paragraph;
      }
      continue;
    }

    // Flush the smaller paragraph group before splitting a large paragraph.
    pushCurrent();

    // Prefer sentence boundaries for long paragraphs.
    const sentences = paragraph
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    let sentenceBuffer = '';
    const flushSentenceBuffer = () => {
      if (!sentenceBuffer) return;
      chunks.push(sentenceBuffer.trim());
      sentenceBuffer = '';
    };

    for (const sentence of sentences) {
      if (sentence.length <= maxChars) {
        if (!sentenceBuffer) sentenceBuffer = sentence;
        else if (sentenceBuffer.length + 1 + sentence.length <= maxChars) {
          sentenceBuffer += ` ${sentence}`;
        } else {
          flushSentenceBuffer();
          sentenceBuffer = sentence;
        }
        continue;
      }

      // If one sentence is still too long, split only at whitespace.
      flushSentenceBuffer();
      const words = sentence.split(/\s+/).filter(Boolean);
      let wordBuffer = '';

      for (const word of words) {
        if (!wordBuffer) {
          wordBuffer = word;
        } else if (wordBuffer.length + 1 + word.length <= maxChars) {
          wordBuffer += ` ${word}`;
        } else {
          chunks.push(wordBuffer.trim());
          wordBuffer = word;
        }
      }

      if (wordBuffer) sentenceBuffer = wordBuffer;
    }

    flushSentenceBuffer();
  }

  pushCurrent();

  // Optional overlap is applied only using complete trailing words.
  // This preserves context without starting a chunk in the middle of a token.
  if (!overlap || chunks.length < 2) return chunks;

  const overlapped = [];
  for (let i = 0; i < chunks.length; i += 1) {
    if (i === 0) {
      overlapped.push(chunks[i]);
      continue;
    }

    const previousWords = chunks[i - 1].split(/\s+/).filter(Boolean);
    let prefix = '';
    for (let j = previousWords.length - 1; j >= 0; j -= 1) {
      const candidate = `${previousWords[j]}${prefix ? ` ${prefix}` : ''}`;
      if (candidate.length > overlap) break;
      prefix = candidate;
    }

    overlapped.push(prefix ? `${prefix} ${chunks[i]}` : chunks[i]);
  }

  return overlapped;
}

function runPdftotext(filePath) {
  return new Promise((resolve, reject) => {
    const child = spawn('pdftotext', ['-layout', filePath, '-']);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', error => reject(error));
    child.on('close', code => code === 0 ? resolve(stdout) : reject(new Error(stderr.trim() || `pdftotext exited with code ${code}`)));
  });
}

export async function extractText(filePath, mimeType, originalName) {
  const extension = path.extname(originalName || '').toLowerCase();
  if (mimeType === 'application/pdf' || extension === '.pdf') return runPdftotext(filePath);
  if (TEXT_MIMES.has(mimeType) || ['.txt', '.md', '.csv', '.json', '.xml'].includes(extension)) {
    return fs.readFile(filePath, 'utf8');
  }
  throw new Error('Unsupported document type. Upload PDF, TXT, MD, CSV, JSON or XML files.');
}

export async function processDocument(documentId) {
  const document = await Document.findById(documentId);
  if (!document) throw new Error('Document not found');

  document.status = 'processing';
  document.processingStatus = 'processing';
  document.errorMessage = '';
  document.embeddingStatus = 'pending';
  document.embeddedChunkCount = 0;
  document.embeddingError = '';
  document.embeddingModel = '';
  await document.save();

  try {
    const storedPath = document.storagePath || document.filename;
    const remote = document.storageProvider === 'supabase' ? await downloadToTemp(storedPath, document.originalName) : { path: path.resolve(env.UPLOAD_DIR, storedPath), cleanup: async () => {} };
    try {
      const text = await extractText(remote.path, document.mimeType, document.originalName);
      const chunks = chunkText(text);

    await StandardChunk.deleteMany({ documentId: document._id });
    if (chunks.length) {
      await StandardChunk.insertMany(chunks.map((value, index) => ({
        standardId: document.standardId || undefined,
        documentId: document._id,
        text: value,
        chunkIndex: index,
        embedding: [],
        metadata: {
          sourceFile: document.originalName,
          extraction: document.mimeType === 'application/pdf' ? 'pdftotext' : 'text-file'
        }
      })));
    }

      document.extractedText = text;
      document.chunkCount = chunks.length;
      document.status = 'processed';
      document.processingStatus = 'completed';
      document.metadata = {
        ...(document.metadata || {}),
        extractedCharacters: text.length,
        processedAt: new Date().toISOString()
      };
      await document.save();
      return document;
    } finally {
      await remote.cleanup();
    }
  } catch (error) {
    document.status = 'failed';
    document.processingStatus = 'failed';
    document.errorMessage = error.message;
    await document.save();
    throw error;
  }
}

export function ensureMongo() {
  if (mongoose.connection.readyState !== 1) throw new Error('MongoDB is not connected');
}
