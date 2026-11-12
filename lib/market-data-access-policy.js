/*
 * Fail-closed market-data access boundary.
 *
 * The current application adapters use Yahoo Finance endpoints through
 * yahoo-finance2 and direct chart/search URLs. yahoo-finance2 describes itself
 * as an unofficial API and says Yahoo provides no official developer API.
 * Yahoo's India Terms of Service §2.4(9) restrict automated data collection
 * without express prior permission. No source-specific permission or licensed
 * entitlement is recorded in this repository, so public API routes must not
 * fetch or serve provider data until an authorized adapter is reviewed.
 *
 * References:
 * https://legal.yahoo.com/in/en/yahoo/terms/otos/index.html
 * https://www.npmjs.com/package/yahoo-finance2
 *
 * This is an API access gate only. It does not alter research logic,
 * frozen protocol definitions, candidate parameters, or backtest math.
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
