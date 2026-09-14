import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { escapeRegex, clampInt } from '../src/utils/security.js';
import { requireRole } from '../src/middleware/role.middleware.js';

let server;
let baseUrl;

test.before(async () => {
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise(resolve => server.close(resolve));
});

test('security helpers escape regex metacharacters and clamp integers', () => {
  assert.equal(escapeRegex('a+b*c?.[x]'), 'a\\+b\\*c\\?\\.\\[x\\]');
  assert.equal(clampInt('999', 20, 1, 100), 100);
  assert.equal(clampInt('-5', 20, 1, 100), 1);
  assert.equal(clampInt('not-a-number', 20, 1, 100), 20);
});

test('role middleware denies unauthorized roles', () => {
  let called = false;
  const res = { status(code) { assert.equal(code, 403); return this; }, json(body) { assert.equal(body.errorCode, 'FORBIDDEN'); } };
  requireRole('admin')({ user: { role: 'viewer' } }, res, () => { called = true; });
  assert.equal(called, false);
});

test('health endpoint exposes request id and security headers', async () => {
  const response = await fetch(`${baseUrl}/api/health`, { headers: { 'X-Request-ID': 'phase10-test-123' } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-request-id'), 'phase10-test-123');
  assert.ok(response.headers.get('x-content-type-options'));
  assert.ok(response.headers.get('content-security-policy'));
});

test('unknown API routes return a controlled 404 response', async () => {
  const response = await fetch(`${baseUrl}/api/does-not-exist`);
  const body = await response.json();
  assert.equal(response.status, 404);
  assert.equal(body.errorCode, 'NOT_FOUND');
});

test('authentication rejects missing and non-HS256 tokens before protected access', async () => {
  const missing = await fetch(`${baseUrl}/api/auth/me`);
  assert.equal(missing.status, 401);

  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const rsaToken = jwt.sign({ id: '000000000000000000000000', role: 'admin' }, privateKey, { algorithm: 'RS256', expiresIn: '1m' });
  const response = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${rsaToken}` } });
  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.errorCode, 'INVALID_AUTH');
});
