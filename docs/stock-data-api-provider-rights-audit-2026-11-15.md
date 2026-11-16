# StockSamjho Market-Data Provider Rights Audit

**Review date:** 2026-11-15  
**Status:** Public-document research only; no provider is authorized or configured  
**Scope:** Candidate broker APIs and exchange-authorised vendor routes for StockSamjho's internal analysis, end-user display, derived analytics and local paper-trading experience

## Executive decision

Do **not** connect a retail broker API to StockSamjho as a general market-data source merely because it exposes quotes, candles or a low-cost/free developer API.

The public terms reviewed for FYERS and Zerodha contain material restrictions that conflict with at least some of StockSamjho's intended use cases. Angel One's official SmartAPI forum moderator also directly rejects redistribution of broker price-feed data from a retail account to other users. Dhan and Upstox expose market-data APIs, but the public material reviewed here does not establish the exact multi-user display, derived-analytics, storage/cache, redistribution and paper-trading rights StockSamjho would need. A technical endpoint or subscription price is not a data licence.

The repository's market-data access policy must remain `NOT_CONFIGURED`. No adapter, provider request, account, subscription, credential, agreement or entitlement is activated by this audit.

## Exchange-authorised route and regulatory constraints (NSE / SEBI)

### SEBI third-party real-time price-data circular and 2026 amendment

**Primary sources:**

- [SEBI Circular SEBI/HO/MRD/MRD-PoD-3/P/CIR/2024/56 — Norms for sharing of real time price data to third parties (24 May 2024)](https://www.sebi.gov.in/sebi_data/attachdocs/may-2024/1716559553659.pdf)
- [SEBI Circular HO/47/17/12(11)2025-MRD-POD3/I/11107/2026 — Norms for sharing and usage of price data for educational purposes (8 May 2026)](https://www.sebi.gov.in/sebi_data/attachdocs/may-2026/1778242522289.pdf), effective **1 July 2026**
- [SEBI Circular SEBI/HO/MIRSD/MIRSD-PoD-1/P/CIR/2025/11 — Details/clarifications on association of regulated persons and agents with persons engaged in prohibited activities (29 January 2025)](https://www.sebi.gov.in/legal/circulars/jan-2025/details-clarifications-on-provisions-related-to-association-of-persons-regulated-by-the-board-miis-and-their-agents-with-persons-engaged-in-prohibited-activities_91356.html)

The 24 May 2024 circular addresses platforms providing virtual trading or fantasy games based on real-time listed-share prices. It directs Market Infrastructure Institutions (MIIs: stock exchanges, clearing corporations and depositories) and registered market intermediaries not to share real-time price data with third parties, including platforms, except where sharing is required for orderly functioning of the securities market or regulatory requirements. It also requires appropriate agreements for permitted real-time sharing and due diligence to prevent misuse.

The 2024 circular originally allowed market price data to be shared for investor education and awareness without monetary incentives with a one-day lag. **That education lag is no longer the current rule.**

#### May 2026 amendment — current education-specific lag

The 8 May 2026 SEBI circular amended the 2024 circular and the related FAQ in the 29 January 2025 circular:

- For investor education and awareness activities **without monetary incentives**, the permitted lag is now **30 days for both sharing and usage**, effective 1 July 2026.
- NISM has a narrow exception for using price data with a one-day lag solely in its simulation lab. This is an NISM-specific exception, not a general simulation or paper-trading permission.
- MIIs and registered market intermediaries sharing data under the education provision must enter an appropriate legal agreement. The agreement must prevent misuse and provide for an audit trail of data usage.
- The amended FAQ says a person engaged **solely in education** must not use price data from the preceding 30 days to mention or display a security name or code in a talk, video, ticker or screen share in a way that indicates a future price, advice or recommendation.

The 30-day rule is an education-specific sharing/usage condition. It does not create a general commercial data licence, does not grant a right to redistribute exchange data, and does not displace the applicable provider/exchange agreement or other regulatory requirements. The NISM exception must not be generalized to other apps or simulated portfolios.

**StockSamjho assessment:** This is a material source-side constraint for StockSamjho's multi-user research, analytics and paper-portfolio experience. StockSamjho is not established as a person engaged solely in investor education; its proposed research, scoring and paper-portfolio features must not be assumed to qualify for the 30-day education provision. Nor does the 2026 amendment turn the 2024 real-time third-party restriction into a general paper-trading exception. The exact source, regulated sharing party, product, data lag, user population, monetary consideration, display, derived analytics, paper/mock-trading valuation, storage/cache and onward-distribution rights require qualified legal/compliance review and explicit written source-specific terms. Keep real-time third-party data blocked unless the precise use is demonstrably authorized; do not rely on the NISM exception or an education-only lag as a workaround.

### NSE Data & Analytics authorised real-time vendor route

**Official sources:**
- [NSE Paid Real Time Data and Data & Info Vending](https://www.nseindia.com/static/market-data/real-time-data-subscription) — the page states that real-time data may be taken through NSE's infrastructure or from an authorised data vendor; the page was marked updated 22 October 2026 when reviewed.
- [NSE Authorised Real Time Data Vendors (PDF)](https://nsearchives.nseindia.com/web/sites/default/files/inline-files/Authorized_Realtime_Data_Vendors.pdf) — the linked one-page roster lists 26 vendors and service coverage columns for Capital Market (CM), F&O, Currency Derivatives (CD), Debt and Index.
- [NSE Data Sharing & Usage Policy](https://www.nseindia.com/static/market-data/nse-data-policy).

The roster marks CM coverage for the following 23 vendors (names reproduced as shown in the NSE PDF):

- Activ Financial
- Bloomberg
- Cogencis Information Services Ltd
- FactSet
- Fidessa
- FIS Global
- Global Financial Datafeeds LLP
- Imagine Software
- Instinet
- ICE Data Services
- Liquidnet
- Market Pulse Technologies Private Ltd
- Morningstar
- Reliable Software Systems Private Ltd
- Refinitiv
- SIX Financial Information
- Spider Software Private Ltd
- Transaction Network Services
- Ticker Data Ltd
- Trading View Inc.
- TrueData Financial Information Private Ltd
- Virtu ITG Holdings LLC
- Xignite Inc

The PDF lists three additional vendors with F&O coverage but no CM checkmark: Quantsapp Private Ltd, Trading Technologies and Vtrender Charts. Segment checkmarks describe the roster's stated service coverage only; they do not establish a particular product, price, historical-data scope or StockSamjho usage right.

NSE's policy says subscribers must execute a relevant agreement that records intended use and how data will be received, transmitted, handled or disseminated. It also says redistribution is not permitted except as agreed in that relevant agreement, and commercial data is provided under the applicable pricing process. Being on the authorised real-time vendor roster is therefore a useful vendor-discovery signal, **not** a blanket downstream redistribution or public-display licence for StockSamjho.

**StockSamjho next step:** Treat NSE Data & Analytics and the roster's CM vendors as a lawful due-diligence shortlist only. Any future request for quotation must ask the contracting entity to specify, in writing, the exact StockSamjho product, user population, CM universe, real-time versus delayed/historical product, web/mobile display, derived analytics, AI explanations, paper/mock-trading valuation, storage/cache/retention, exports and onward redistribution rights. No vendor has been contacted or selected in this audit; no account, trial, purchase, subscription, credential, agreement or ingestion is authorised.

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

### Angel One SmartAPI

**Official sources:**
- [SmartAPI Instruments and live market-data documentation](https://smartapi.angelone.in/docs/Instruments)
- [SmartAPI FAQ](https://smartapi.angelone.in/faq)
- [Official SmartAPI moderator response: can I build a platform for users and show data/charts fetched from my account?](https://smartapi.angelone.in/smartapi/forum/topic/5712/can-i-build-a-platform-for-users-and-show-data-charts-fetched-from-my-account/2?lang=en-US)
- [Official SmartAPI moderator response: personal use and static-IP requirement](https://smartapi.angelone.in/smartapi/forum/topic/5733/use-of-static-api/5?lang=en-US)

The SmartAPI documentation describes authenticated live quote modes (LTP, OHLC and FULL), historical-data APIs and instrument-master access. These establish technical capabilities, not permission to operate a shared market-data service.

In the official SmartAPI forum thread about building a platform where other users would view live, historical and options data fetched through one Angel One account, a SmartAPI moderator answered that this is **not allowed** and that broker-provided price-feed data cannot be further redistributed by the end user. In a separate read-only personal-dashboard discussion, the moderator said personal use is permitted, while a static IP was still required at that time. A separate moderator explanation says the static-IP condition applies across SmartAPI app types, not only order execution.

**StockSamjho assessment:** Not approved as a shared feed for StockSamjho's multi-user pages or user-facing market-data service under ordinary retail SmartAPI access. The personal-use clarification does not grant rights to serve other StockSamjho users. The cited forum response does not independently settle every question about derived analytics, storage/cache or paper-trading valuation; those uses remain unverified and must not be enabled. Any enterprise or other exception would need explicit written permission covering the exact StockSamjho product, data uses and user population. Do not use a personal Angel One account or token as a shared service credential.

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
| Angel One SmartAPI | Live quotes, historical data, streaming and instrument-master APIs are documented | SmartAPI moderator says retail-account price-feed data cannot be further redistributed to other users; personal use is a separate scope | **NOT APPROVED** as a shared StockSamjho feed |
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
- Do not connect FYERS, Zerodha or Angel One retail SmartAPI to the public app or paper-trading simulator as a shared data source under the reviewed public terms/support guidance.
- Keep DhanHQ and Upstox at `UNKNOWN` until their complete current terms and exact written permissions are verified.
- Do not use a broker's customer-specific token as a shared StockSamjho service credential.
- Do not change the ₹5,00,000 browser-local paper portfolio, its accounting, or its manual-price-mark behavior as part of this rights audit.
- No provider adapter, ingestion, cache, database, API activation, credential, account, subscription, agreement or purchase is introduced here.
- No strategy, scanner rule, candidate definition, frozen research/holdout architecture, strategy parameter or backtest mathematics is changed.

This is an engineering source-readiness record, not legal advice. Obtain qualified legal/compliance review of the actual agreement and applicable exchange/regulatory requirements before onboarding any source.
