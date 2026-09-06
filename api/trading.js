import { analyzeVerified } from '../lib/verified-analysis.js';
import { buildActionability } from '../lib/actionability.js';
import { gateTradingAction, productionDecisionPolicy } from '../lib/production-decision-gate.js';

const HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS', 'Cache-Control': 'no-store' };
const unavailable = e => /no data found|symbol may be delisted|insufficient market data|verified market data unavailable/i.test(String(e?.message || ''));

export default async function handler(req, res) {
  Object.entries(HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const symbol = String(req.query?.symbol || '').trim().toUpperCase();
  if (!/^[A-Za-z0-9.&_-]{1,25}(?:\.(?:NS|BO))?$/i.test(symbol)) return res.status(400).json({ error: 'Valid stock symbol is required' });
  try {
    const analysis = await analyzeVerified(symbol);
    const actionability = buildActionability(analysis, { technical: analysis.technical });
    const decisionPolicy = productionDecisionPolicy();
    const swing = actionability.horizons?.swing || {};
    const longTerm = actionability.horizons?.longTerm || {};
    const tradeAction = gateTradingAction(swing.action);
    const longTermAction = gateTradingAction(longTerm.action);
    const technical = { ...analysis.technical, productionDecisionBlocked: !decisionPolicy.productionActionsEnabled };
    const trade = {
      action: tradeAction,
      reason: swing.trigger || null,
      entry: swing.entry || null,
      breakout: swing.breakout || null,
      stopLoss: swing.stopLoss || null,
      target1: swing.target1 || null,
      target2: swing.target2 || null,
      riskReward: technical.breakoutLifecycle?.riskEvidence?.riskReward ?? null,
      canonicalEvidence: technical.breakoutLifecycle || null,
      provenance: technical.provenance || null,
    };
    const legacyLongTerm = {
      score: actionability.investmentScore ?? null,
      action: longTermAction,
      fundamental: actionability.verifiedEvidence?.fundamentalScore ?? null,
      valuation: actionability.verifiedEvidence?.valuationScore ?? null,
      financialStrength: analysis.score?.risk != null ? 100 - Number(analysis.score.risk) : null,
      buyBelow: longTerm.buyBelow ?? null,
      fairValue: analysis.valuation?.fairValue ?? null,
      reason: longTerm.reason || null,
    };
    return res.status(200).json({
      symbol: analysis.stock?.symbol,
      price: analysis.stock?.price ?? technical.last ?? null,
      currency: analysis.stock?.currency || 'INR',
      asOf: analysis.provenance?.marketData?.asOf || technical.provenance?.observationTimestamp || null,
      chart: analysis.verifiedMarketHistory?.slice(-180) || [],
      technical,
      trade,
      periods: { longTerm: '3–10Y', swing: '2–20D', shortTerm: '1–5D' },
      longTerm: legacyLongTerm,
      actionability,
      decisionPolicy,
      provenance: analysis.provenance,
    });
  } catch (e) {
    if (unavailable(e)) {
      console.warn('[TRADING DATA UNAVAILABLE]', { symbol, message: e?.message });
      return res.status(404).json({ success: false, error: 'Verified market data is unavailable for this symbol.' });
    }
    console.error('[TRADING ERROR]', { symbol, message: e?.message, stack: e?.stack });
    return res.status(502).json({ error: 'Trading data temporarily unavailable. Please try again.' });
  }
}
