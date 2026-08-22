(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>\"] /g, (m) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', ' ':' ' }[m]));
  const INR = (v) => typeof v === 'number' && Number.isFinite(v) ? '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : 'Not Available';

  function ensurePanel() {
    let p = $('backendAuthorityPanel');
    if (p) return p;
    const host = document.querySelector('#decision .panel') || document.querySelector('#decision');
    if (!host) return null;
    p = document.createElement('div');
    p.id = 'backendAuthorityPanel';
    p.style.cssText = 'margin:0 0 12px;padding:14px;border:1px solid #dfe5ee;border-radius:12px;background:#fff;box-shadow:0 5px 18px rgba(20,35,55,.05)';
    p.innerHTML = '<div style="font:700 10px ui-monospace,monospace;letter-spacing:1px;color:#687587;text-transform:uppercase">Authoritative backend decision</div><div id="backendOverall" style="font:900 22px ui-monospace,monospace;margin:6px 0;color:#a56800">Loading…</div><div id="backendMeta" style="font:11px ui-monospace,monospace;color:#687587"></div><div id="backendHorizons" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px"></div>';
    host.prepend(p);
    return p;
  }

  function render(d, analysis) {
    const p = ensurePanel();
    if (!p) return;
    const blocked = d.productionTradingEnabled !== true || d.productionActionsEnabled === false || d.productionDecisionBlocked === true;
    const overall = d.overallStance || 'WAIT';
    const color = String(overall).includes('BUY') ? '#11834a' : String(overall).includes('SELL') ? '#c63d49' : '#a56800';
    $('backendOverall').textContent = overall;
    $('backendOverall').style.color = color;
    $('backendMeta').textContent = `${blocked ? 'PRODUCTION ACTION BLOCKED' : 'PRODUCTION ELIGIBLE'} • authority: ${d.decisionAuthority || 'backend-actionability-v1'} • confidence: ${d.confidence ?? 'N/A'} • coverage: ${d.sectorCoverage ?? 'N/A'}%`;
    const h = d.horizons || {};
    $('backendHorizons').innerHTML = ['longTerm','swing','shortTerm'].map((k) => {
      const x = h[k] || {};
      return `<div style="padding:9px;border:1px solid #edf0f4;border-radius:9px;background:#fbfcfe"><div style="font:700 9px ui-monospace,monospace;color:#687587">${k === 'longTerm' ? 'LONG TERM' : k === 'shortTerm' ? 'SHORT TERM' : 'SWING'}</div><div style="font:800 12px ui-monospace,monospace;margin-top:4px">${esc(x.productionAction || x.action || 'WAIT')}</div><div style="font:10px system-ui;color:#687587;margin-top:3px">${esc(x.status || '')}</div></div>`;
    }).join('');

    // The analysis API owns the canonical score at score.technical.
    // The terminal historically expected technical.score, so adapt the
    // response contract here without calculating or inventing a score.
    const technicalScore = analysis?.score?.technical;
    const scoreEl = $('tscore');
    const barEl = $('tsbar');
    if (scoreEl) scoreEl.textContent = Number.isFinite(technicalScore) ? `${technicalScore}/100` : '—';
    if (barEl) barEl.style.width = Number.isFinite(technicalScore) ? `${Math.max(0, Math.min(100, technicalScore))}%` : '0%';
  }

  async function refresh() {
    const input = $('symbol');
    const symbol = input?.value?.trim()?.toUpperCase();
    if (!symbol) return;
    try {
      const [actionabilityResponse, analysisResponse] = await Promise.all([
        fetch('/api/actionability?symbol=' + encodeURIComponent(symbol), { cache: 'no-store' }),
        fetch('/api/analyze?symbol=' + encodeURIComponent(symbol), { cache: 'no-store' }),
      ]);
      const d = await actionabilityResponse.json();
      const analysis = await analysisResponse.json();
      if (!actionabilityResponse.ok || d.success === false) throw new Error(d.error || 'Decision unavailable');
      if (!analysisResponse.ok || analysis.success === false) throw new Error(analysis.error || 'Analysis unavailable');
      render(d, analysis);
    } catch (e) {
      const p = ensurePanel();
      if (p) {
        $('backendOverall').textContent = 'DECISION UNAVAILABLE';
        $('backendOverall').style.color = '#c63d49';
        $('backendMeta').textContent = 'Backend authority could not be verified. Do not treat client-derived BUY/SELL as production-authorized.';
        $('backendHorizons').innerHTML = '';
        const scoreEl = $('tscore');
        const barEl = $('tsbar');
        if (scoreEl) scoreEl.textContent = '—';
        if (barEl) barEl.style.width = '0%';
      }
    }
  }

  function wire() {
    const btn = $('analyse');
    if (btn) btn.addEventListener('click', () => setTimeout(refresh, 250));
    const input = $('symbol');
    if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') setTimeout(refresh, 250); });
    document.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => setTimeout(refresh, 250)));
    refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
