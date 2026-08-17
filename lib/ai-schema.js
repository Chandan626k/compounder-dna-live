const REQUIRED_SECTIONS = [
  'businessQuality',
  'numbersValuation',
  'risks',
  'thesis',
  'whatToMonitor',
];

export function parseAIResponse(content) {
  let parsed;
  try {
    parsed = typeof content === 'string' ? JSON.parse(content) : content;
  } catch {
    throw new Error('AI returned invalid JSON');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('AI returned an invalid object');
  }

  for (const key of REQUIRED_SECTIONS) {
    if (typeof parsed[key] !== 'string' || !parsed[key].trim()) {
      throw new Error(`AI response missing section: ${key}`);
    }
    if (parsed[key].length > 4000) {
      throw new Error(`AI response section too long: ${key}`);
    }
  }
  return parsed;
}

const escapeHTML = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

export function renderAIHtml(parsed) {
  const labels = [
    ['Business & Moat', parsed.businessQuality],
    ['Numbers & Valuation', parsed.numbersValuation],
    ['Risks', parsed.risks],
    ['Long-term Thesis', parsed.thesis],
    ['What to Monitor', parsed.whatToMonitor],
  ];
  return labels.map(([label, value]) => `<section><h3>${label}</h3><p>${escapeHTML(value).replaceAll('\n', '<br>')}</p></section>`).join('');
}
