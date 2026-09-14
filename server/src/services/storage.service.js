import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

function supabaseEnabled() {
  return env.STORAGE_PROVIDER === 'supabase';
}

function assertSupabaseConfig() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_BUCKET) {
    throw new Error('Supabase Storage is enabled but SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_BUCKET is missing.');
  }
}

function objectUrl(storagePath) {
  assertSupabaseConfig();
  return `${env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/${encodeURIComponent(env.SUPABASE_BUCKET)}/${storagePath.split('/').map(encodeURIComponent).join('/')}`;
}

async function supabaseRequest(url, options = {}) {
  assertSupabaseConfig();
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Supabase Storage request failed (${response.status}): ${body.slice(0, 500)}`);
  }
  return response;
}

export function storagePathFor(filename) {
  const now = new Date();
  return `documents/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${filename}`;
}

export async function uploadFile(localPath, storagePath, contentType) {
  if (!supabaseEnabled()) return { provider: 'local', path: localPath };
  const data = await fs.readFile(localPath);
  await supabaseRequest(objectUrl(storagePath), {
    method: 'POST',
    headers: {
      'Content-Type': contentType || 'application/octet-stream',
      'x-upsert': 'false'
    },
    body: data
  });
  return { provider: 'supabase', path: storagePath };
}

export async function downloadToTemp(storagePath, originalName = 'document') {
  if (!supabaseEnabled()) {
    return { path: path.resolve(env.UPLOAD_DIR, storagePath), cleanup: async () => {} };
  }

  const response = await supabaseRequest(objectUrl(storagePath), { method: 'GET' });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'standards-intelligence-'));
  const safeName = `${crypto.randomUUID()}-${path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const tempPath = path.join(tempDir, safeName);
  await fs.writeFile(tempPath, Buffer.from(await response.arrayBuffer()));

  return {
    path: tempPath,
    cleanup: async () => fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
  };
}

export async function deleteFile(storagePath) {
  if (!storagePath) return;
  if (!supabaseEnabled()) {
    await fs.unlink(path.resolve(env.UPLOAD_DIR, storagePath)).catch(() => {});
    return;
  }

  await supabaseRequest(`${env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/${encodeURIComponent(env.SUPABASE_BUCKET)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: [storagePath] })
  });
}

export function storageProvider() {
  return env.STORAGE_PROVIDER;
}
