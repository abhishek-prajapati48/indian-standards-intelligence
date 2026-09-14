import { env } from '../config/env.js';

const DEFAULT_MODEL = 'gemini-2.5-flash';

function extractText(data) {
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) {
    return data.map((item) => item?.generated_text || item?.text || '').filter(Boolean).join('\n');
  }
  return data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || '').join('') ||
    data?.generated_text || data?.text || data?.output?.text || '';
}

function parseJson(text) {
  const raw = String(text || '').trim();
  try { return JSON.parse(raw); } catch {}
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch {}
  }
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try { return JSON.parse(raw.slice(first, last + 1)); } catch {}
  }
  return null;
}

export function llmConfig() {
  return {
    provider: String(env.LLM_PROVIDER || 'gemini').toLowerCase(),
    model: env.LLM_MODEL || DEFAULT_MODEL,
    configured: Boolean(env.LLM_API_KEY)
  };
}

async function callGemini(prompt) {
  const model = env.LLM_MODEL || DEFAULT_MODEL;
  const endpoint = env.LLM_API_URL || `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.LLM_API_KEY)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
    })
  });
  const raw = await response.text();
  let data; try { data = JSON.parse(raw); } catch { data = raw; }
  if (!response.ok) {
    const message = typeof data === 'object' ? data?.error?.message || JSON.stringify(data) : String(data);
    const error = new Error(`LLM provider request failed (${response.status}): ${message}`);
    error.code = 'LLM_PROVIDER_ERROR';
    throw error;
  }
  return extractText(data);
}

async function callHuggingFace(prompt) {
  const model = env.LLM_MODEL || 'HuggingFaceH4/zephyr-7b-beta';
  const endpoint = env.LLM_API_URL || `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(model).replace(/%2F/g, '/')}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.LLM_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 1200, temperature: 0.1, return_full_text: false } })
  });
  const raw = await response.text();
  let data; try { data = JSON.parse(raw); } catch { data = raw; }
  if (!response.ok) {
    const message = typeof data === 'object' ? data?.error || JSON.stringify(data) : String(data);
    const error = new Error(`LLM provider request failed (${response.status}): ${message}`);
    error.code = 'LLM_PROVIDER_ERROR';
    throw error;
  }
  return extractText(data);
}

export async function generateStructured(prompt) {
  if (!env.LLM_API_KEY) {
    const error = new Error('LLM_API_KEY is not configured. Add an LLM provider key to server/.env.');
    error.code = 'LLM_NOT_CONFIGURED';
    throw error;
  }
  const provider = String(env.LLM_PROVIDER || 'gemini').toLowerCase();
  const text = provider === 'huggingface' ? await callHuggingFace(prompt) : await callGemini(prompt);
  const parsed = parseJson(text);
  if (!parsed) {
    const error = new Error('LLM returned a non-JSON response. Try again or use a provider/model with reliable JSON output.');
    error.code = 'LLM_INVALID_JSON';
    throw error;
  }
  return parsed;
}
