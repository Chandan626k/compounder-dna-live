# StockSamjho Market-Data Provider Rights Audit

**Review date:** 2026-11-15  
**Status:** Public-document research only; no provider is authorized or configured  
**Scope:** Candidate broker APIs for StockSamjho's internal analysis, end-user display, derived analytics and local paper-trading experience

## Executive decision

Do **not** connect a retail broker API to StockSamjho as a general market-data source merely because it exposes quotes, candles or a low-cost/free developer API.

The public terms reviewed for FYERS and Zerodha contain material restrictions that conflict with at least some of StockSamjho's intended use cases. Dhan and Upstox expose market-data APIs, but the public material reviewed here does not establish the exact multi-user display, derived-analytics, storage/cache, redistribution and paper-trading rights StockSamjho would need. A technical endpoint or subscription price is not a data licence.

The repository's market-data access policy must remain `NOT_CONFIGURED`. No adapter, provider request, account, subscription, credential, agreement or entitlement is activated by this audit.

## Provider findings

### FYERS

**Official source:** [FYERS API Terms & Conditions](https://fyers.in/terms-and-conditions-api)

The current public terms reviewed on 2026-11-15 state that:

- API access by a Client is subject to the documented API methods and applicable regulatory/exchange approvals for a public platform.
- Section 11 prohibits permitting third-party use of the APIs and says exchange data must not be used for unauthorised purposes, including development of charting, technical tools, paper trading, gaming and virtual trading.
- Section 12 requires FYERS' written consent for activities including creating copies/caches for redistribution, creating derivative works, selling, distributing, publicly displaying or sublicensing API-returned content.

**StockSamjho assessment:** Not approved for the current product scope. The public terms do not establish permission for StockSamjho's paper-trading simulator, technical analysis, public display or multi-user data service. Do not build an adapter based on the fact that the retail API is advertised as free. Any possible exception must be explicit, written and scoped by FYERS and any required exchange/statutory approvals.

### Zerodha Kite Connect

**Official source:** [Kite Connect Terms and Conditions](https://www.kite.trade/terms/)

The current public terms reviewed on 2026-11-15 state that:

- Live market data obtained through Kite Connect cannot be displayed to the public at large.
- The APIs and/or live market data must not be used for virtual/mock trading apps or trading-related games.
- Copying, caching for redistribution, modifying, distributing, publicly displaying or sublicensing API-returned content is restricted unless expressly permitted by Zerodha or applicable law.

Zerodha's support material also describes Kite Connect as an execution suite rather than a market-data vending service for other platforms: [Can I use historical and live data from Kite Connect API on other platforms?](https://support.zerodha.com/category/trading-and-markets/general-kite/kite-api/articles/can-i-use-historical-and-live-data-taken-from-kite-connect-api-on-other-platforms).

**StockSamjho assessment:** Not approved as the data source for public StockSamjho pages or the paper-trading simulator under the standard public terms. A paid retail API plan is not evidence of public display, mock-trading or redistribution rights. Do not create an app, subscribe or ingest data for this project unless a separate written permission or exchange-authorised data-vending arrangement expressly covers the intended use.

### DhanHQ

**Official sources:**
- [DhanHQ Data API access and pricing](https://dhan.co/support/platforms/dhanhq-api/how-can-i-access-live-market-data-through-dhan/)
- [DhanHQ exchange and segment coverage FAQ](https://dhan.co/support/platforms/dhanhq-api/are-data-apis-available-for-all-exchanges-and-segments-on-dhan/)
- [DhanHQ API Partner Declaration](https://survey.dhan.co/api-partner-declaration-mar25)
- [DhanHQ Terms & Conditions](https://dhanhq.co/terms/)

The public support pages state that the Data API subscription is ₹499 plus applicable taxes per month and includes live market feed, live quotes, historical data and intraday data. Dhan's partner declaration asks an organisation/product to acknowledge DhanHQ API Terms & Conditions and regulatory/data-usage policies. The linked terms page did not expose readable terms in this review.

**StockSamjho assessment:** Technical capability is documented, but the rights decision is **UNVERIFIED**. The subscription price and exchange/segment availability do not prove that one account or token may serve StockSamjho's other users, or that data may be publicly displayed, cached, used in derived analytics, exported or used in a paper-trading simulator. Do not subscribe, submit a partner declaration, create an account or integrate until the complete current terms and written source-specific permissions are reviewed.

### Upstox

**Official sources:**
- [Upstox Developer API overview](https://upstox.com/developer/api-documentation/)
- [Market Data Feed V3](https://upstox.com/developer/api-documentation/v3/get-market-data-feed/)
- [Analytics Token announcement](https://upstox.com/developer/api-documentation/announcements/analytics-token/)

The developer documentation describes quote, historical-candle, option-chain, market-information, fundamentals, news and WebSocket data surfaces. The Analytics Token is described as read-only; that is an API permission boundary, not a market-data redistribution licence.

**StockSamjho assessment:** Technical capability is documented, but public display, multi-tenant use, derived analytics, storage/cache, redistribution and paper-trading rights were not established by the public API pages reviewed. Keep rights **UNKNOWN**. Do not create an app, request tokens or integrate until the applicable legal terms and any required exchange/vendor permissions are verified for the exact StockSamjho use.

## Cross-provider decision matrix

| Provider | Technical market-data API evidence | Restriction or unresolved right | StockSamjho decision |
|---|---|---|---|
| FYERS | Quotes, historical and real-time APIs are documented | Public terms restrict exchange-data use for charting/technical tools and paper/virtual trading; written consent is required for specified copying, caching and distribution | **NOT APPROVED** under public terms |
| Zerodha Kite Connect | Live and historical market-data APIs are documented | Public display and virtual/mock trading are prohibited under standard terms; redistribution/copy/cache is restricted | **NOT APPROVED** under public terms |
| DhanHQ | Live feed, quotes, historical and intraday APIs are documented | Full current API terms and exact multi-user/display/derived/paper-trading rights not verified in this review | **UNKNOWN — no integration** |
| Upstox | Quote, historical, fundamentals and streaming APIs are documented | Exact multi-user/display/derived/storage/redistribution/paper-trading rights not verified in the API pages reviewed | **UNKNOWN — no integration** |
| Exchange-authorised data vendor | Product-specific feed may be available | Must verify the precise contract, data scope, retention, display, derived-use and redistribution rights | **Potential path; no purchase or onboarding authorised** |

## Required evidence before any adapter can be enabled

A provider review must obtain and preserve written, source-specific evidence covering all of the following:

1. The legal contracting entity, exact API product, data source and applicable agreement/version.
2. Permitted exchanges, segments, instrument types, symbols/universe, intervals, latency class and historical lookback.
3. Internal non-display analysis and use by StockSamjho staff.
4. Display of raw quotes/candles and other source data to StockSamjho end users on web/mobile.
5. Derived analytics, indicators, rankings, screeners, AI-generated explanations and other derived outputs.
6. Paper/mock/virtual trading and simulations, including whether market data may be used to value simulated positions.
7. Storage, caching, retention, backups, cross-tenant isolation and deletion requirements.
8. API responses, exports, downloads, customer APIs, redistribution, sublicensing and public display.
9. Rate limits, concurrency, request quotas, IP restrictions, authentication model, audit/reporting duties and end-user account requirements.
10. Agreement term, suspension/revocation, termination, data-deletion obligations and any required exchange/SEBI/statutory approvals.

A broker login, personal trading account, API key, free API tier, read-only token, successful HTTP response or subscription payment does not independently establish these rights.

## Implementation consequences

- Keep `MARKET_DATA_ACCESS_POLICY.status = NOT_CONFIGURED` and all protected market-data routes fail-closed.
- Do not connect FYERS or Zerodha to the public app or paper-trading simulator under their standard public terms.
- Keep DhanHQ and Upstox at `UNKNOWN` until their complete current terms and exact written permissions are verified.
- Do not use a broker's customer-specific token as a shared StockSamjho service credential.
- Do not change the ₹5,00,000 browser-local paper portfolio, its accounting, or its manual-price-mark behavior as part of this rights audit.
- No provider adapter, ingestion, cache, database, API activation, credential, account, subscription, agreement or purchase is introduced here.
- No strategy, scanner rule, candidate definition, frozen research/holdout architecture, strategy parameter or backtest mathematics is changed.

This is an engineering source-readiness record, not legal advice. Obtain qualified legal/compliance review of the actual agreement and applicable exchange/regulatory requirements before onboarding any source.
