export function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

export function isSafeText(value, maxLength = 10000) {
  return typeof value === 'string' && value.length <= maxLength && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value);
}
