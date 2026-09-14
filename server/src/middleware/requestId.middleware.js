import crypto from 'node:crypto';

export function requestId(req, res, next) {
  const incoming = String(req.get('x-request-id') || '').trim();
  const id = /^[A-Za-z0-9._:-]{1,100}$/.test(incoming) ? incoming : crypto.randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
}
