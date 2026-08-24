import assert from 'node:assert/strict';
import { mergeStatementEvidence } from '../lib/statement-evidence.js';
import { createCanonicalEvidence } from '../lib/financial-evidence.js';

const date = '2025-03-31T00:00:00.000Z';
const meta = (sourceKey) => createCanonicalEvidence({
  source: 'YAHOO_FINANCE', sourceKey, issuer: 'Test Issuer', ticker: 'TEST.NS', reportingDate: date,
  reportingPeriod: '2025-03-31', periodType: 'ANNUAL', statementScope: 'CONSOLIDATED', unit: 'INR_CRORE', currency: 'INR',
  reportedOrDerived: 'REPORTED', status: 'PROVIDER_RETURNED',
});

const raw = {
  income: {
    ebitda: { status: 'PROVIDER_RETURNED', value: 220, key: 'EBITDA', date },
    ebit: { status: 'PROVIDER_RETURNED', value: 200, key: 'EBIT', date },
    eps: { status: 'PROVIDER_RETURNED', value: 15, key: 'dilutedEPS', date },
    netIncome: { status: 'PROVIDER_RETURNED', value: 100, key: 'netIncome', date },
  },
  balance: {
    totalAssets: { status: 'PROVIDER_RETURNED', value: 1500, key: 'totalAssets', date }, totalDebt: { status: 'PROVIDER_RETURNED', value: 250, key: 'totalDebt', date },
    cash: { status: 'PROVIDER_RETURNED', value: 75, key: 'cashCashEquivalentsAndShortTermInvestments', date }, equity: { status: 'PROVIDER_RETURNED', value: 1250, key: 'stockholdersEquity', date },
    currentAssets: { status: 'PROVIDER_RETURNED', value: 300, key: 'currentAssets', date }, currentLiabilities: { status: 'PROVIDER_RETURNED', value: 133, key: 'currentLiabilities', date },
    workingCapital: { status: 'PROVIDER_RETURNED', value: 167, key: 'workingCapital', date }, ordinaryShares: { status: 'PROVIDER_RETURNED', value: 100, key: 'ordinarySharesNumber', date },
  },
  cash: {
    operatingCashFlow: { status: 'PROVIDER_RETURNED', value: 180, key: 'operatingCashFlow', date }, investingCashFlow: { status: 'PROVIDER_RETURNED', value: -120, key: 'investingCashFlow', date },
    financingCashFlow: { status: 'PROVIDER_RETURNED', value: -80, key: 'financingCashFlow', date }, changeInCash: { status: 'PROVIDER_RETURNED', value: -20, key: 'changesInCash', date },
    freeCashFlow: { status: 'PROVIDER_RETURNED', value: 175, key: 'freeCashFlow', date }, capitalExpenditure: { status: 'PROVIDER_RETURNED', value: -55, key: 'capitalExpenditure', date },
    dividends: { status: 'PROVIDER_RETURNED', value: -40, key: 'commonStockDividendPaid', date }, stockBasedCompensation: { status: 'PROVIDER_RETURNED', value: 12, key: 'stockBasedCompensation', date },
  },
};
const canonicalEvidence = { byId: {}, fields: {} };
for (const fields of Object.values(raw)) for (const [field, item] of Object.entries(fields)) {
  const e = meta(item.key); canonicalEvidence.byId[e.evidenceId] = e; canonicalEvidence.fields[field] = e.evidenceId;
}
const evidence = { provider: 'Yahoo Finance fundamentalsTimeSeries', period: 'annual / 12M', coverage: { income: true, balanceSheet: true, cashFlow: true }, evidence: raw, canonicalEvidence, history: { incomeYears: 4, balanceYears: 4, cashFlowYears: 4 }, errors: { income: null, balance: null, cash: null } };

const merged = mergeStatementEvidence({ current: {}, derived: {}, rawAvailability: {} }, evidence);
assert.equal(merged.current.totalAssets, 1500); assert.equal(merged.current.totalDebt, 250); assert.equal(merged.current.cash, 75); assert.equal(merged.current.equity, 1250);
assert.equal(merged.current.workingCapital, 167); assert.equal(merged.current.ordinaryShares, 100); assert.equal(merged.current.ebitda, 220); assert.equal(merged.current.ebit, 200); assert.equal(merged.current.eps, 15);
assert.equal(merged.current.operatingCashFlow, 180); assert.equal(merged.current.investingCashFlow, -120); assert.equal(merged.current.financingCashFlow, -80); assert.equal(merged.current.changeInCash, -20);
assert.equal(merged.current.freeCashFlow, 175); assert.equal(merged.current.capitalExpenditure, -55); assert.equal(merged.current.dividends, -40); assert.equal(merged.current.stockBasedCompensation, 12);
assert.equal(merged.derived.debtToEquityFromStatements, 0.2); assert.equal(merged.derived.currentRatioFromStatements, 300 / 133); assert.equal(merged.derived.fcfConversion, 175);
assert.ok(merged.evidence.fields.totalDebt); assert.equal(merged.evidence.byId[merged.evidence.fields.totalDebt].sourceKey, 'totalDebt');
assert.equal(merged.statementEvidence, evidence);

const incompatible = mergeStatementEvidence({ current: {}, derived: {}, rawAvailability: {} }, { coverage: { income: true, balanceSheet: true, cashFlow: false }, evidence: { balance: { totalDebt: raw.balance.totalDebt, equity: { ...raw.balance.equity, date: '2024-03-31T00:00:00.000Z' } } }, canonicalEvidence: { byId: { [meta('totalDebt').evidenceId]: meta('totalDebt'), [meta('stockholdersEquity').evidenceId]: meta('stockholdersEquity') }, fields: { totalDebt: meta('totalDebt').evidenceId, equity: meta('stockholdersEquity').evidenceId } } });
assert.equal(incompatible.derived.debtToEquityFromStatements, null);

const unavailable = mergeStatementEvidence({ current: {}, derived: {}, rawAvailability: {} }, { coverage: { income: true, balanceSheet: true, cashFlow: true }, evidence: { balance: { totalAssets: { status: 'PROVIDER_DID_NOT_RETURN', value: null, key: null, date: null } }, cash: { investingCashFlow: { status: 'PROVIDER_DID_NOT_RETURN', value: null, key: null, date: null } } } });
assert.equal(unavailable.current.totalAssets, null); assert.equal(unavailable.current.investingCashFlow, null); assert.notEqual(unavailable.current.totalAssets, 0);

console.log('statement-evidence.unit: PASS');
