/*
 * Fail-closed market-data access boundary.
 *
 * No source-specific permission or licensed entitlement is currently recorded
 * for the legacy Yahoo Finance adapters. Do not fetch or serve market data
 * until a documented provider and exact use entitlement are reviewed.
 *
 * This is an access gate only. It does not alter research logic, frozen
 * protocol definitions, candidate parameters, or backtest mathematics.
 */
export const MARKET_DATA_ACCESS_POLICY = Object.freeze({
  status: 'NOT_CONFIGURED',
  code: 'AUTHORIZED_MARKET_DATA_SOURCE_NOT_CONFIGURED',
  message: 'No authorized market-data provider is configured. No market-data request was made.',
});

export function sendMarketDataUnavailable(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Request-ID');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(503).json({
    success: false,
    status: 'UNAVAILABLE',
    code: MARKET_DATA_ACCESS_POLICY.code,
    error: MARKET_DATA_ACCESS_POLICY.message,
    dataStatus: 'UNAVAILABLE',
    policy: {
      sourceAccess: MARKET_DATA_ACCESS_POLICY.status,
      providerRequestMade: false,
      fabricatedData: false,
      missingDataAction: 'RETURN_UNAVAILABLE',
      retryable: false,
    },
  });
}
