import assert from 'node:assert/strict';
import { mergeStatementEvidence } from '../lib/statement-evidence.js';
import { createCanonicalEvidence } from '../lib/financial-evidence.js';

const meta = (sourceKey, value, reportingDate = '2025-03-31T00:00:00.000Z') => createCanonicalEvidence({
  source: 'YAHOO_FINANCE', sourceKey, value, issuer: 'Test Issuer', ticker: 'TEST.NS',
  reportingDate, reportingPeriod: reportingDate.slice(0, 10), periodType: 'ANNUAL',
  statementScope: 'CONSOLIDATED', unit: 'INR_CRORE', currency: 'INR',
  reportedOrDerived: 'REPORTED', status: 'PROVIDER_RETURNED',
});

const rows = {
  income: [
    { date: '2024-03-31T00:00:00.000Z', periodType: '12M', totalRevenue: 900, EBITDA: 180, EBIT: 160, dilutedEPS: 12, netIncome: 80, interestExpense: 20 },
    { date: '2025-03-31T00:00:00.000Z', periodType: '12M', totalRevenue: 1000, EBITDA: 220, EBIT: 200, dilutedEPS: 15, netIncome: 100, interestExpense: 20 },
  ],
  balance: [
    { date: '2025-03-31T00:00:00.000Z', periodType: '12M', totalAssets: 1500, totalDebt: 250, cashCashEquivalentsAndShortTermInvestments: 75, stockholdersEquity: 1250, currentAssets: 300, currentLiabilities: 133 },
  ],
  cash: [
    { date: '2025-03-31T00:00:00.000Z', periodType: '12M', operatingCashFlow: 180, freeCashFlow: 175, capitalExpenditure: -55 },
  ],
};

const canonical = { byId: {}, fields: {}, observations: {}, history: {} };
const add = (field, key, value, date) => {
  const e = meta(key, value, date);
  canonical.byId[e.evidenceId] = e;
  canonical.fields[field] = e.evidenceId;
  canonical.observations[field] = e.evidenceId;
  canonical.history[field] = canonical.history[field] || [];
  canonical.history[field].push(e.evidenceId);
};
add('revenue', 'totalRevenue', 1000, '2025-03-31T00:00:00.000Z');
add('revenue', 'totalRevenue', 900, '2024-03-31T00:00:00.000Z');
add('ebitda', 'EBITDA', 220, '2025-03-31T00:00:00.000Z');
add('ebit', 'EBIT', 200, '2025-03-31T00:00:00.000Z');
add('eps', 'dilutedEPS', 15, '2025-03-31T00:00:00.000Z');
add('netIncome', 'netIncome', 100, '2025-03-31T00:00:00.000Z');
add('interestExpense', 'interestExpense', 20, '2025-03-31T00:00:00.000Z');
for (const [field,key,value] of [['totalAssets','totalAssets',1500],['totalDebt','totalDebt',250],['cash','cashCashEquivalentsAndShortTermInvestments',75],['equity','stockholdersEquity',1250],['currentAssets','currentAssets',300],['currentLiabilities','currentLiabilities',133]]) add(field,key,value,'2025-03-31T00:00:00.000Z');
for (const [field,key,value] of [['operatingCashFlow','operatingCashFlow',180],['freeCashFlow','freeCashFlow',175],['capitalExpenditure','capitalExpenditure',-55]]) add(field,key,value,'2025-03-31T00:00:00.000Z');

const evidence = {
  ticker: 'TEST.NS', fetchedAt: '2025-04-01T00:00:00.000Z',
  evidence: {
    income: { revenue:{status:'PROVIDER_RETURNED',value:1000,key:'totalRevenue',date:'2025-03-31T00:00:00.000Z',row:rows.income[1]}, ebitda:{status:'PROVIDER_RETURNED',value:220,key:'EBITDA',date:'2025-03-31T00:00:00.000Z',row:rows.income[1]}, ebit:{status:'PROVIDER_RETURNED',value:200,key:'EBIT',date:'2025-03-31T00:00:00.000Z',row:rows.income[1]}, eps:{status:'PROVIDER_RETURNED',value:15,key:'dilutedEPS',date:'2025-03-31T00:00:00.000Z',row:rows.income[1]}, netIncome:{status:'PROVIDER_RETURNED',value:100,key:'netIncome',date:'2025-03-31T00:00:00.000Z',row:rows.income[1]}, interestExpense:{status:'PROVIDER_RETURNED',value:20,key:'interestExpense',date:'2025-03-31T00:00:00.000Z',row:rows.income[1]} },
    balance: { totalAssets:{status:'PROVIDER_RETURNED',value:1500,key:'totalAssets',date:'2025-03-31T00:00:00.000Z',row:rows.balance[0]}, totalDebt:{status:'PROVIDER_RETURNED',value:250,key:'totalDebt',date:'2025-03-31T00:00:00.000Z',row:rows.balance[0]}, cash:{status:'PROVIDER_RETURNED',value:75,key:'cashCashEquivalentsAndShortTermInvestments',date:'2025-03-31T00:00:00.000Z',row:rows.balance[0]}, equity:{status:'PROVIDER_RETURNED',value:1250,key:'stockholdersEquity',date:'2025-03-31T00:00:00.000Z',row:rows.balance[0]}, currentAssets:{status:'PROVIDER_RETURNED',value:300,key:'currentAssets',date:'2025-03-31T00:00:00.000Z',row:rows.balance[0]}, currentLiabilities:{status:'PROVIDER_RETURNED',value:133,key:'currentLiabilities',date:'2025-03-31T00:00:00.000Z',row:rows.balance[0]} },
    cash: { operatingCashFlow:{status:'PROVIDER_RETURNED',value:180,key:'operatingCashFlow',date:'2025-03-31T00:00:00.000Z',row:rows.cash[0]}, freeCashFlow:{status:'PROVIDER_RETURNED',value:175,key:'freeCashFlow',date:'2025-03-31T00:00:00.000Z',row:rows.cash[0]}, capitalExpenditure:{status:'PROVIDER_RETURNED',value:-55,key:'capitalExpenditure',date:'2025-03-31T00:00:00.000Z',row:rows.cash[0]} }
  },
  canonicalEvidence: canonical,
  coverage:{income:true,balanceSheet:true,cashFlow:true}, history:{incomeYears:2,balanceYears:1,cashFlowYears:1}, errors:{income:null,balance:null,cash:null}
};

const merged = mergeStatementEvidence({
  current: { revenue: 2000, ebitda: 400, netIncome: 200, totalDebt: 999 },
  derived: {}, growth: {}, rawAvailability: {}
}, evidence);

assert.equal(merged.current.revenue, 2000, 'current provider revenue must remain distinct from annual statement revenue');
assert.equal(merged.derived.fcfMargin, 17.5, 'derived FCF margin must use compatible annual evidence, not current/TTM revenue');
assert.equal(merged.derived.netDebtToEbitda, (250 - 75) / 220, 'derived leverage must use compatible annual evidence');
assert.equal(merged.derivedEvidence.fcfMargin.reportedOrDerived, 'DERIVED');
assert.equal(merged.derivedEvidence.fcfMargin.inputEvidenceIds.length, 2);
assert.ok(merged.derivedEvidence.fcfMargin.inputEvidenceIds.every(id => merged.evidence.byId[id]));
assert.equal(merged.growth.revenue3yCagr, undefined, 'insufficient 3Y history must remain unavailable');
console.log('financial-metric-lineage.unit: PASS');
