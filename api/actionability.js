import { analyze as analyzeStock } from '../lib/market-engine.js';
import { buildTrading } from '../lib/trading-engine.js';
import { buildActionability } from '../lib/actionability.js';
import { buildScenarios, scenarioEvidenceFromValidation } from '../lib/scenario-engine.js';
import { validateStrategy } from '../lib/strategy-validation.js';

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Cache-Control': 'no-store',
};

const num = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v && typeof v === 'object' && Number.isFinite(v.raw)) return v.raw;
  return null;
};

async function fetchChart(symbol) {
  const YahooFinance = (await import('yahoo-finance2')).default;
  const yahooFinance = new YahooFinance();
  const ticker = String(symbol).endsWith('.NS') || String(symbol).endsWith('.BO') ? String(symbol) : `${symbol}.NS`;
  const data = await yahooFinance.chart(ticker, {
    period1: new Date(Date.now() - 2 * 365.25 * 24 * 60 * 60 * 1000),
    period2: new Date(),
    interval: '1d',
    events: 'div,splits',
    return: 'object',
  });
  const rows = [];
  if (Array.isArray(data?.quotes)) {
    for (const item of data.quotes) {
      const close = num(item?.close), high = num(item?.high), low = num(item?.low), volume = num(item?.volume);
      if (close != null && high != null && low != null && volume != null) {
        const date = item.date instanceof Date ? item.date : new Date(item.date);
        if (!Number.isNaN(date.getTime())) rows.push({ date: date.toISOString(), open: num(item?.open), close, high, low, volume });
      }
    }
  } else {
    const timestamps = data?.timestamp || [];
    const q = data?.indicators?.quote?.[0] || {};
    for (let i = 0; i < timestamps.length; i++) {
      const close = num(q.close?.[i]), high = num(q.high?.[i]), low = num(q.low?.[i]), volume = num(q.volume?.[i]);
      if (close != null && high != null && low != null && volume != null) {
        rows.push({ date: new Date(timestamps[i] * 1000).toISOString(), open: num(q.open?.[i]), close, high, low, volume });
      }
    }
  }
  if (rows.length < 60) throw Error(`Insufficient market data (${rows.length} points)`);
  return rows;
}

export default async function handler(req, res) {
  Object.entries(HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const symbol = String(req.query?.symbol || '').trim().toUpperCase();
  if (!/^[A-Za-z0-9.&_-]{1,25}(?:\.(?:NS|BO))?$/i.test(symbol)) return res.status(400).json({ success: false, error: 'Valid stock symbol is required' });
  try {
    const analysis = await analyzeStock(symbol);
    const [rows, validation] = await Promise.all([
      fetchChart(symbol),
      // Fixed default validation parameters. No parameter tuning is performed here.
      validateStrategy(symbol, { days: 2500, horizon: 20 }),
    ]);

    const trading = buildTrading(analysis, rows);
    const statementEvidence = analysis.fundamentals?.statementEvidence;
    const result = buildActionability(analysis, trading);
    const historicalEvidence = scenarioEvidenceFromValidation(validation);
    const scenarios = buildScenarios({
      price: result.currentPrice,
      support: result.technical?.support,
      resistance: result.technical?.resistance,
      atr: result.technical?.atr,
      historicalEvidence,
    });

    const productionDecisionBlocked = true;
    const productionActionsEnabled = false;
    const productionBlockReasons = [
      'Production BUY/SELL actions are disabled until strategy validation is production-eligible.',
    ];

    return res.status(200).json({
      ...result,
      scenarios,
      scenarioValidation: {
        status: historicalEvidence.status,
        source: historicalEvidence.source || null,
        sampleSize: historicalEvidence.sampleSize || 0,
        checks: historicalEvidence.checks || null,
        confidenceIntervals95: historicalEvidence.confidenceIntervals95 || null,
        limitations: historicalEvidence.limitations || [],
      },
      statementEvidence: {
        provider: statementEvidence.provider,
        period: statementEvidence.period,
        coverage: statementEvidence.coverage,
        history: statementEvidence.history,
        errors: statementEvidence.errors,
        validation: statementEvidence.validation,
      },
      productionDecisionBlocked,
      productionActionsEnabled,
      productionBlockReasons,
      decisionAuthority: 'backend-actionability-v1',
      uiContract: {
        useBackendDecision: true,
        ignoreClientDerivedBuySell: true,
        allowedProductionActions: [],
      },
      horizons: Object.fromEntries(Object.entries(result.horizons || {}).map(([horizon, value]) => [horizon, {
        ...value,
        productionEligible: false,
        productionAction: 'NO TRADE — VALIDATION REQUIRED',
      }])),
    });
  } catch (e) {
    console.error('[ACTIONABILITY ERROR]', { symbol, message: e?.message, stack: e?.stack });
    return res.status(502).json({ success: false, error: 'Actionability data temporarily unavailable. Please try again.' });
  }
}
