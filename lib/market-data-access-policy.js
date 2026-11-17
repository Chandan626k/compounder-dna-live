/*
 * Fail-closed market-data access boundary.
 *
 * Yahoo Finance is currently used through unofficial endpoints without a
 * source-specific permission or licensed entitlement recorded in this repo.
 * Public data routes therefore remain unavailable until an authorized
 * provider and its permitted use are configured and independently reviewed.
 *
 * This access gate does not alter research logic, frozen protocol definitions,
 * candidate parameters, accounting, or backtest mathematics.
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
