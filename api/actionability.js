import { analyzeVerified } from '../lib/verified-analysis.js';
import { buildActionability } from '../lib/actionability.js';
import { buildScenarios, scenarioEvidenceFromValidation } from '../lib/scenario-engine.js';
import { validateStrategy } from '../lib/strategy-validation.js';

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Cache-Control': 'no-store',
};

export default async function handler(req, res) {
  Object.entries(HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const symbol = String(req.query?.symbol || '').trim().toUpperCase();
  if (!/^[A-Za-z0-9.&_-]{1,25}(?:\.(?:NS|BO))?$/i.test(symbol)) return res.status(400).json({ success: false, error: 'Valid stock symbol is required' });
  try {
    const analysis = await analyzeVerified(symbol);
    const [rows, validation] = await Promise.all([
      Promise.resolve(analysis.verifiedMarketHistory),
      // Fixed default validation parameters. No parameter tuning is performed here.
      validateStrategy(symbol, { days: 2500, horizon: 20 }),
    ]);

    // Canonical technical evidence is already present on the verified analysis.
    // Do not recalculate indicators in this consumer; actionability receives the
    // authoritative technical object and may only derive presentation/stance fields.
    const trading = { technical: analysis.technical };
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
      currentQuote: analysis.currentQuote || null,
      priceSource: analysis.provenance?.priceSelection || null,
      marketDataProvenance: analysis.provenance?.marketData || null,
      technicalProvenance: analysis.technical?.provenance || null,
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
        provider: statementEvidence?.provider,
        period: statementEvidence?.period,
        coverage: statementEvidence?.coverage,
        history: statementEvidence?.history,
        errors: statementEvidence?.errors,
        validation: statementEvidence?.validation,
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
