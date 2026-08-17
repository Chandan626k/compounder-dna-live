// Validation helpers for the AI narrative endpoint.
const finite = (v) => typeof v === 'number' && Number.isFinite(v);

export function safeMetric(metrics, key, decimals = 1) {
  const value = metrics?.[key];
  if (value == null || value === '') return 'N/A';
  const n = typeof value === 'object' && value !== null && finite(value.raw) ? value.raw : Number(value);
  if (!Number.isFinite(n)) return 'N/A';
  return n.toFixed(decimals);
}

export function validateAnalyzeRequest(body) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { valid: false, errors: ['Request body is required.'] };
  if (!String(body.symbol || '').trim()) errors.push('symbol is required. AI analysis must use the canonical backend analysis object.');
  if (body.symbol != null && !/^[A-Za-z0-9.&^_-]{1,25}(?:\.(?:NS|BO))?$/i.test(String(body.symbol).trim())) errors.push('symbol is invalid.');
  if (body.horizon != null && (!Number.isFinite(Number(body.horizon)) || Number(body.horizon) < 1 || Number(body.horizon) > 100)) errors.push('horizon must be between 1 and 100.');
  return { valid: errors.length === 0, errors };
}
