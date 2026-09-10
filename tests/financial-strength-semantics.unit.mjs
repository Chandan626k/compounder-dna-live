import assert from 'node:assert/strict';
import { applyFinancialStrengthSemantics } from '../lib/financial-strength-semantics.js';
import { buildLongTermState } from '../lib/multi-horizon-intelligence.js';
import { buildInvestmentReadiness } from '../lib/investment-readiness.js';
import { applyDecisionEvidenceGate } from '../lib/decision-evidence-gate.js';
import { gateTradingAction } from '../lib/production-decision-gate.js';

const partial = applyFinancialStrengthSemantics({
  financialStrength: 45,
  financialStrengthRaw: 45,
  financialStrengthCoverage: 'PARTIAL',
  financialStrengthEvidence: ['Debt/Equity'],
});
assert.equal(partial.financialStrength, 45);
assert.equal(partial.financialStrengthRaw, 45);
assert.equal(partial.financialStrengthCoverage, 'PARTIAL');
assert.equal(partial.financialStrengthStatus, 'PARTIAL_RESEARCH_SCORE');
assert.equal(partial.financialStrengthUsableForLongTerm, false);

const currentOnly = applyFinancialStrengthSemantics({
  financialStrength: 45,
  financialStrengthRaw: 45,
  financialStrengthCoverage: 'CURRENT_FIELDS_ONLY',
  financialStrengthEvidence: ['Debt/Equity'],
});
assert.equal(currentOnly.financialStrength, 45);
assert.equal(currentOnly.financialStrengthStatus, 'CURRENT_SNAPSHOT_ONLY');
assert.equal(currentOnly.financialStrengthUsableForLongTerm, false);

const full = applyFinancialStrengthSemantics({
  financialStrength: 82,
  financialStrengthRaw: 82,
  financialStrengthCoverage: 'FULL',
  financialStrengthEvidence: ['Debt/Equity', 'Net Debt/EBITDA', 'Current Ratio'],
});
assert.equal(full.financialStrength, 82);
assert.equal(full.financialStrengthRaw, 82);
assert.equal(full.financialStrengthStatus, 'VERIFIED_FULL_COVERAGE');
assert.equal(full.financialStrengthUsableForLongTerm, true);

const unavailable = applyFinancialStrengthSemantics({
  financialStrength: 50,
  financialStrengthRaw: 50,
  financialStrengthCoverage: 'CURRENT_FIELDS_ONLY',
  financialStrengthEvidence: [],
});
assert.equal(unavailable.financialStrength, null);
assert.equal(unavailable.financialStrengthRaw, null);
assert.equal(unavailable.financialStrengthStatus, 'UNAVAILABLE');
assert.equal(unavailable.financialStrengthUsableForLongTerm, false);

function incompleteLongTermAnalysis(financialStrength) {
  return {
    stock: { yahooSymbol: 'TEST.NS' },
    fundamentals: {
      evidence: { fields: {}, byId: {} },
      statementEvidence: { income: [], balance: [], cash: [] },
    },
    valuation: { fairValue: null, verdict: 'DATA INSUFFICIENT', metricLineage: {} },
    score: {
      financialStrength,
      financialStrengthCoverage: 'CURRENT_FIELDS_ONLY',
      financialStrengthStatus: 'CURRENT_SNAPSHOT_ONLY',
      financialStrengthUsableForLongTerm: false,
    },
    provenance: { annualFundamentals: { source: 'TEST', period: '12M/annual', asOf: '2026-09-01T00:00:00.000Z' } },
    horizonFreshness: { longTerm: 'FRESH' },
  };
}

const highPartialLongTerm = buildLongTermState(incompleteLongTermAnalysis(90));
assert.equal(highPartialLongTerm.state, 'INSUFFICIENT_EVIDENCE');
assert.equal(highPartialLongTerm.negativeEvidence.length, 0);

const lowPartialLongTerm = buildLongTermState(incompleteLongTermAnalysis(10));
assert.equal(lowPartialLongTerm.state, 'INSUFFICIENT_EVIDENCE');
assert.equal(lowPartialLongTerm.negativeEvidence.length, 0);

const noFcfDebtHistory = buildLongTermState(incompleteLongTermAnalysis(45));
assert.equal(noFcfDebtHistory.state, 'INSUFFICIENT_EVIDENCE');
assert.deepEqual(noFcfDebtHistory.negativeEvidence, []);

const investmentBase = {
  fundamentals: { ratios: { roe: 22 }, growth: { revenue3yCagr: 12 }, derived: { fcfConversion: 82 } },
  valuation: { fairValue: 180, currentPrice: 150, marginOfSafety: 16.6, verdict: 'ATTRACTIVE', metricLineage: {} },
  technical: { last: 150 },
  dataQuality: { confidence: 88, completeness: 82 },
  score: { overall: 84, financialStrength: 90, financialStrengthCoverage: 'CURRENT_FIELDS_ONLY', financialStrengthStatus: 'CURRENT_SNAPSHOT_ONLY', financialStrengthUsableForLongTerm: false, dataLimited: true },
  stock: { yahooSymbol: 'TEST.NS' },
};
const investment = buildInvestmentReadiness(investmentBase);
assert.equal(investment.verifiedEvidence.valuationScore, null);
assert.notEqual(investment.classification, 'INVESTMENT CANDIDATE — HIGH EVIDENCE');

const gated = applyDecisionEvidenceGate({
  ...investmentBase,
  decision: { action: 'BUY / ACCUMULATE', blockers: [] },
});
assert.equal(gated.decision.gate.status, 'BLOCKED');
assert.equal(gated.decision.action, 'WAIT — EVIDENCE INCOMPLETE');

assert.equal(gateTradingAction('BUY / ACCUMULATE'), 'NO TRADE — VALIDATION REQUIRED');
assert.equal(gateTradingAction('SELL'), 'NO TRADE — VALIDATION REQUIRED');
assert.equal(gateTradingAction('EXECUTE'), 'EXECUTE');

console.log('financial-strength-semantics.unit: PASS');
