// Validation helpers for the optional AI narrative POST endpoint.
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
  if (!body || typeof body !== 'object') return { valid: false, errors: ['Request body is required.'] };
  if (!String(body.stockName || '').trim()) errors.push('stockName is required.');
  if (body.sector != null && typeof body.sector !== 'string') errors.push('sector must be a string.');
  if (body.industry != null && typeof body.industry !== 'string') errors.push('industry must be a string.');
  if (body.metrics != null && (typeof body.metrics !== 'object' || Array.isArray(body.metrics))) errors.push('metrics must be an object.');
  if (body.scores != null && (typeof body.scores !== 'object' || Array.isArray(body.scores))) errors.push('scores must be an object.');
  if (body.horizon != null && (!Number.isFinite(Number(body.horizon)) || Number(body.horizon) < 1 || Number(body.horizon) > 100)) errors.push('horizon must be between 1 and 100.');
  return { valid: errors.length === 0, errors };
}
