import assert from 'node:assert/strict';
import { assessProviderMonetarySemantics, buildValuation } from '../lib/market-engine.js';

const base = () => ({
  summary: {
    price: { currency: 'INR', financialCurrency: 'INR', regularMarketTime: 1750000000 },
    financialData: { ebitda: 500 },
    defaultKeyStatistics: { enterpriseValue: 5000, enterpriseToEbitda: 10, enterpriseToRevenue: 2 },
  },
  trailing: [{ date: '2025-03-31T00:00:00.000Z', periodType: 'TTM', TYPE: 'FINANCIALS', currencyCode: 'INR', EBITDA: 500, totalRevenue: 2500 }],
  annual: [],
});

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

const allowed = buildValuation(base(), 1000, matchingEvidence(base()));
assert.equal(allowed.enterpriseValue, 5000);
assert.equal(allowed.evToEbitda, 10);
assert.equal(allowed.evToRevenue, 2);
assert.equal(blocked.fairValue, allowed.fairValue);
console.log('provider-monetary-semantics.unit: PASS');
