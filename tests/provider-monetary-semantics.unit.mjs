import assert from 'node:assert/strict';
import { assessProviderMonetarySemantics, buildValuation } from '../lib/market-engine.js';
import { deriveFinancialCurrency } from '../lib/statement-evidence.js';

const base = () => ({
  summary: {
    price: { currency: 'INR', financialCurrency: 'INR', regularMarketTime: 1750000000 },
    financialData: { ebitda: 500 },
    defaultKeyStatistics: { enterpriseValue: 5000, enterpriseToEbitda: 10, enterpriseToRevenue: 2 },
  },
  trailing: [{ date: '2025-03-31T00:00:00.000Z', periodType: 'TTM', TYPE: 'FINANCIALS', currencyCode: 'INR', EBITDA: 500, totalRevenue: 2500 }],
  annual: [],
});

assert.equal(deriveFinancialCurrency([
  { date: '2025-03-31', currencyCode: 'USD', totalRevenue: 100 },
  { date: '2025-03-31', currencyCode: 'USD', EBITDA: 20 },
]), 'USD');
assert.equal(deriveFinancialCurrency([
  { date: '2025-03-31', currencyCode: 'USD', totalRevenue: 100 },
  { date: '2025-03-31', currencyCode: 'INR', EBITDA: 20 },
]), null, 'mixed statement currencies must remain UNKNOWN');
assert.equal(deriveFinancialCurrency([{ date: '2025-03-31', totalRevenue: 100 }]), null, 'missing statement currency must remain UNKNOWN');

const matchingEvidence = (fixture) => ({
  currency: {
    tradingCurrency: fixture.summary.price.currency,
    financialCurrency: fixture.summary.price.financialCurrency,
    status: fixture.summary.price.currency && fixture.summary.price.financialCurrency
      ? (fixture.summary.price.currency === fixture.summary.price.financialCurrency ? 'MATCH' : 'MISMATCH')
      : 'UNKNOWN',
  },
});

const compatible = assessProviderMonetarySemantics(base(), matchingEvidence(base()));
assert.equal(compatible.compatible.enterpriseValue, true);
assert.equal(compatible.compatible.evToEbitda, true);
assert.equal(compatible.compatible.evToRevenue, true);
assert.equal(compatible.ebitda.periodType, 'TTM');
assert.equal(compatible.revenue.periodType, 'TTM');
assert.equal(compatible.ebitda.currency, 'INR');
assert.equal(compatible.revenue.currency, 'INR');

for (const [name, mutate] of [
  ['unknown currency', x => { x.summary.price.currency = null; x.summary.price.financialCurrency = null; }],
  ['mismatched currency', x => { x.summary.price.financialCurrency = 'USD'; }],
  ['missing observation', x => { delete x.summary.price.regularMarketTime; }],
  ['missing provenance', x => { delete x.summary.defaultKeyStatistics; }],
]) {
  const fixture = structuredClone(base());
  mutate(fixture);
  const semantics = assessProviderMonetarySemantics(fixture, matchingEvidence(fixture));
  assert.equal(semantics.compatible.enterpriseValue, false, `${name}: EV blocked`);
  assert.equal(semantics.compatible.evToEbitda, false, `${name}: EV/EBITDA blocked`);
  assert.equal(semantics.compatible.evToRevenue, false, `${name}: EV/Revenue blocked`);
  assert.equal(semantics.enterpriseValue.reason, 'CURRENCY_OR_PERIOD_SEMANTICS_UNVERIFIED', `${name}: reason`);
}

for (const [name, mutate, ratioKey] of [
  ['incompatible EBITDA period', x => { x.trailing[0].periodType = '12M'; }, 'evToEbitda'],
  ['incompatible EBITDA currency', x => { x.trailing[0].currencyCode = 'USD'; }, 'evToEbitda'],
  ['incompatible revenue period', x => { x.trailing[0].periodType = '12M'; }, 'evToRevenue'],
  ['incompatible revenue currency', x => { x.trailing[0].currencyCode = 'USD'; }, 'evToRevenue'],
]) {
  const fixture = structuredClone(base());
  mutate(fixture);
  const semantics = assessProviderMonetarySemantics(fixture, matchingEvidence(fixture));
  assert.equal(semantics.compatible.enterpriseValue, true, `${name}: EV remains independently compatible`);
  assert.equal(semantics.compatible[ratioKey], false, `${name}: ${ratioKey} blocked`);
}

const blocked = buildValuation(
  { ...base(), summary: { ...base().summary, price: { currency: 'INR', financialCurrency: 'USD', regularMarketTime: 1750000000 } } },
  1000,
  { currency: { tradingCurrency: 'INR', financialCurrency: 'USD', status: 'MISMATCH' } },
);
assert.equal(blocked.enterpriseValue, null);
assert.equal(blocked.evToEbitda, null);
assert.equal(blocked.evToRevenue, null);
assert.equal(blocked.providerMonetarySemantics.enterpriseValue.reason, 'CURRENCY_OR_PERIOD_SEMANTICS_UNVERIFIED');

const runtimeLikeInfy = {
  summary: {
    price: { currency: 'INR', financialCurrency: 'INR', regularMarketTime: 1750000000 },
    financialData: { ebitda: 500 },
    defaultKeyStatistics: { enterpriseValue: 5000, enterpriseToEbitda: 10, enterpriseToRevenue: 2 },
  },
  trailing: [{ date: '2025-03-31T00:00:00.000Z', periodType: 'TTM', TYPE: 'FINANCIALS', currencyCode: 'USD', EBITDA: 500, totalRevenue: 2500 }],
  annual: [],
};
const infyEvidence = {
  currency: { tradingCurrency: 'INR', financialCurrency: deriveFinancialCurrency(runtimeLikeInfy.trailing), status: 'MISMATCH' },
};
const infyBlocked = buildValuation(runtimeLikeInfy, 1000, infyEvidence);
assert.equal(infyEvidence.currency.financialCurrency, 'USD', 'financial currency must come from statement evidence, not price metadata');
assert.equal(infyBlocked.enterpriseValue, null);
assert.equal(infyBlocked.evToEbitda, null);
assert.equal(infyBlocked.evToRevenue, null);
assert.equal(infyBlocked.fairValue, buildValuation(base(), 1000, matchingEvidence(base())).fairValue, 'fair value methodology must remain unchanged');

const allowed = buildValuation(base(), 1000, matchingEvidence(base()));
assert.equal(allowed.enterpriseValue, 5000);
assert.equal(allowed.evToEbitda, 10);
assert.equal(allowed.evToRevenue, 2);

// API-boundary regression: the canonical valuation object is already gated;
// serializing it must not reintroduce blocked provider monetary metrics.
const serializedBlocked = JSON.parse(JSON.stringify(infyBlocked));
assert.equal(serializedBlocked.enterpriseValue, null);
assert.equal(serializedBlocked.evToEbitda, null);
assert.equal(serializedBlocked.evToRevenue, null);
assert.equal(serializedBlocked.providerMonetarySemantics.enterpriseValue.evidenceStatus, 'NOT_AVAILABLE');
assert.equal(serializedBlocked.providerMonetarySemantics.evToEbitda.evidenceStatus, 'NOT_AVAILABLE');
assert.equal(serializedBlocked.providerMonetarySemantics.evToRevenue.evidenceStatus, 'NOT_AVAILABLE');

console.log('provider-monetary-semantics.unit: PASS');
