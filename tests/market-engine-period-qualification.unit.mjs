import assert from 'node:assert/strict';
import { buildFinancials } from '../lib/market-engine.js';

const base = {
  summary: {},
  trailing: [],
  errors: { summary: null, annual: null, trailing: null },
};

const qualified = buildFinancials({
  ...base,
  annual: [{
    date: '2025-03-31T00:00:00.000Z',
    periodType: '12M',
    requestedPeriod: 'annual',
    providerType: 'FINANCIALS',
    totalRevenue: 1000,
  }],
});
assert.equal(qualified.current.revenue, 1000, 'explicit 12M annual evidence must be accepted');

const quarterly = buildFinancials({
  ...base,
  annual: [{
    date: '2025-06-30T00:00:00.000Z',
    periodType: '3M',
    requestedPeriod: 'annual',
    providerType: 'FINANCIALS',
    totalRevenue: 900,
  }],
});
assert.equal(quarterly.current.revenue, null, '3M evidence must not qualify as annual merely because annual was requested');

const trailing = buildFinancials({
  ...base,
  annual: [{
    date: '2025-03-31T00:00:00.000Z',
    periodType: 'TTM',
    requestedPeriod: 'annual',
    providerType: 'FINANCIALS',
    totalRevenue: 850,
  }],
});
assert.equal(trailing.current.revenue, null, 'TTM evidence must not qualify as annual');

const missingPeriod = buildFinancials({
  ...base,
  annual: [{
    date: '2025-03-31T00:00:00.000Z',
    requestedPeriod: 'annual',
    providerType: 'FINANCIALS',
    totalRevenue: 800,
  }],
});
assert.equal(missingPeriod.current.revenue, null, 'missing provider periodType must not qualify as annual');

console.log('market-engine-period-qualification.unit: PASS');
