# StockSamjho Market-Data Provider Rights Audit

**Review date:** 2026-11-15  
**Status:** Public-document research only; no provider is authorized or configured  
**Scope:** Candidate broker APIs and exchange-authorised vendor routes for StockSamjho's internal analysis, end-user display, derived analytics and local paper-trading experience

## Executive decision

Do **not** connect a retail broker API to StockSamjho as a general market-data source merely because it exposes quotes, candles or a low-cost/free developer API.

The public terms reviewed for FYERS and Zerodha contain material restrictions that conflict with at least some of StockSamjho's intended use cases. Angel One's official SmartAPI forum moderator also directly rejects redistribution of broker price-feed data from a retail account to other users. Dhan and Upstox expose market-data APIs, but the public material reviewed here does not establish the exact multi-user display, derived-analytics, storage/cache, redistribution and paper-trading rights StockSamjho would need. A technical endpoint or subscription price is not a data licence.

The repository's market-data access policy must remain `NOT_CONFIGURED`. No adapter, provider request, account, subscription, credential, agreement or entitlement is activated by this audit.

The exchange-vendor review also found that Global Financial Datafeeds' published API terms limit the standard API service to a single subscriber and exclude virtual/simulation use unless the stated exchange/SEBI approvals are obtained; its purchase page limits the APIs to individual personal use and requires exchange agreements and fees for commercial use. Spider Software's published software/data terms prohibit redistribution and limit a subscription to one terminal. Cogencis exposes an enterprise API and institutional data platform, but its public pages do not establish StockSamjho's downstream rights. These findings narrow the usable shortlist; none authorizes a provider.

## Exchange-authorised route and regulatory constraints (NSE / SEBI)

### SEBI third-party real-time price-data circular

**Primary source:** [SEBI Circular SEBI/HO/MRD/MRD-PoD-3/P/CIR/2024/56 — Norms for sharing of real time price data to third parties (24 May 2024)](https://www.sebi.gov.in/sebi_data/attachdocs/may-2024/1716559553659.pdf)

The circular responds to platforms offering virtual trading or fantasy games based on real-time listed-share prices. Its conditions include:

- Market Infrastructure Institutions (stock exchanges, clearing corporations and depositories) and registered market intermediaries must ensure real-time price data is not shared with third parties, including platforms, except where sharing is required for orderly functioning of the securities market or regulatory requirements.
- Where such sharing is permitted, the MII or intermediary must enter an appropriate agreement that identifies the activities for which the data will be used and the justification; the entity/activity list is subject to at least annual board review.
- Market price data may be shared for investor-education and awareness activities with a **one-day lag**, without offering monetary incentives to participants.
- The circular also requires due diligence and contractual provisions intended to prevent misuse.

**StockSamjho assessment:** This is a material constraint for the proposed paper-trading and multi-user product. The one-day-lag investor-education provision is a potential route to investigate, not an automatic licence for StockSamjho and not permission to use a retail broker token. It does not establish that a paid product, derived analytics, paper-portfolio valuation, storage/cache or any particular vendor feed is covered. Obtain qualified legal/compliance review and written source-specific terms before relying on it. Keep real-time third-party display blocked unless the precise activity is demonstrably within an applicable exception and agreement.

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

### TrueData: exchange-listed, but public terms exclude paper trading

**Official sources:**
- [TrueData Market Data API — compliance requirements and usage restrictions](https://www.truedata.in/market-data-apis)
- [TrueData Terms & Conditions](https://www.truedata.in/terms-and-conditions)
- [NSE Authorised Real Time Data Vendors (PDF)](https://nsearchives.nseindia.com/web/sites/default/files/inline-files/Authorized_Realtime_Data_Vendors.pdf)

TrueData appears on the NSE authorised real-time vendor roster with a Capital Market (CM) coverage mark and describes APIs for NSE/BSE/MCX market data. Its public Market Data API compliance page, reviewed on 2026-11-15, states that:

- Data is licensed for individual or institutional **internal use only**; redistribution, resale or public sharing is not allowed without prior written permission.
- Display on a website/app for public or client access, or integration of live feeds into a commercial platform, requires written approval from both the exchanges and TrueData, plus separate licensing/exchange documentation.
- The page expressly lists gamification, trading-based competitions, virtual/simulated trading, paper trading, trading simulators, mock-trading environments, virtual-money setups and model portfolios that replicate trading behaviour as prohibited activities, including for educational institutions and training platforms.
- For trading-education applications, the page says real-time feeds must not be displayed; delayed data with a minimum one-day lag still requires the necessary exchange approval or licence.
- The page describes institutional bulk and multi-user API setups, but that technical/enterprise capability does not override the stated paper/simulation prohibition or establish StockSamjho's downstream display and redistribution rights.

**StockSamjho assessment:** **NOT APPROVED for the existing paper-trading simulator or model-portfolio valuation under the published API usage restrictions.** Public/client display and redistribution are also not approved without separate written approvals and licensing. Internal proprietary analysis may fit the page's stated internal-use category, but the exact API product, exchange scope, storage rights, fees and contract must still be confirmed in writing. Do not request a trial, create an account, subscribe or integrate as part of this audit.


### Global Financial Datafeeds (GFDL): standard API terms exclude shared and simulation use

**Official sources:**
- [Who can purchase Global Datafeeds APIs](https://globaldatafeeds.in/global-datafeeds-apis/global-datafeeds-apis/pricing-sales/who-can-purchase/)
- [Global Datafeeds APIs and published API conditions](https://globaldatafeeds.in/apis/)
- [NSE Authorised Real Time Data Vendors (PDF)](https://nsearchives.nseindia.com/web/sites/default/files/inline-files/Authorized_Realtime_Data_Vendors.pdf)

Global Financial Datafeeds LLP appears on the NSE real-time vendor roster with Capital Market (CM) coverage. Its public API purchase guidance says the APIs available there are for **individual users for personal use**; commercial use requires an agreement with the respective exchanges and payment of the requisite fees.

The API page describes WebSocket, REST, .NET, COM and FIX delivery for web, mobile and desktop development. However, the same page's published conditions say that:
- Information received from Global Datafeeds must be terminated at the subscriber's end.
- Data is not provided for gaming, lottery, virtual trading or simulation applications; customers with such requirements are told to obtain approvals from NSE and SEBI first.
- Data is for charting/analysis use of a **single subscriber only**.

**StockSamjho assessment:** **NOT APPROVED under the published standard API conditions** for a shared multi-user StockSamjho feed or the existing paper-trading/simulation workflow. The vendor's NSE roster status and technical API breadth do not override the single-subscriber and simulation restrictions. The public pages do not evidence that StockSamjho has the required approvals or a separate commercial agreement. Do not use a personal API plan, request a trial, subscribe or integrate. Any distinct enterprise route would need written exchange approvals and an executed agreement that expressly covers the product, user population, derived use, storage, display and simulations.

### Spider Software: single-terminal licence and redistribution prohibition

**Official sources:**
- [Spider Software Terms & Conditions](https://www.spidersoftwareindia.com/terms-conditions.php)
- [NSE Authorised Real Time Data Vendors (PDF)](https://nsearchives.nseindia.com/web/sites/default/files/inline-files/Authorized_Realtime_Data_Vendors.pdf)

Spider Software appears on the NSE vendor roster with CM coverage and publicly markets software using live NSE data. Its published subscriber terms state that a subscription is for one instance on one computer / one terminal, is non-exclusive and non-assignable, and that redistribution of data from its software in any form is strictly prohibited.

**StockSamjho assessment:** **NOT APPROVED under the published standard software/data subscription** as a shared StockSamjho market-data source. A single-terminal, non-assignable licence and an express redistribution prohibition conflict with serving data to multiple StockSamjho users. The public terms reviewed do not establish a separate enterprise feed licence or paper-trading permission. Do not repurpose a desktop subscription or redistribute its data. Any claimed exception must be evidenced by a separate written agreement and the necessary exchange permissions before use.

### NSE Cogencis Enterprise Solutions: enterprise integration candidate, rights unverified

**Official sources:**
- [Cogencis Data Platform](https://www.cogencis.com/data)
- [Cogencis Enterprise Solutions](https://www.cogencis.com/cogencis_enterprise_solutions)
- [NSE Authorised Real Time Data Vendors (PDF)](https://nsearchives.nseindia.com/web/sites/default/files/inline-files/Authorized_Realtime_Data_Vendors.pdf)

Cogencis describes a Data Platform covering real-time and historical market data, reference/entity data, corporate actions, fundamentals and estimates. It says the platform can be accessed through Cogencis WorkStation or an open API deployed into enterprise applications. Its enterprise page lists institutional use cases including portfolio valuation, risk management, trading/investment strategy and regulatory compliance.

**StockSamjho assessment:** This is the most directly enterprise-oriented integration route identified in this public-source review, so it merits priority in a future written due-diligence request. However, the public pages do **not** establish the exact StockSamjho rights for multi-user web/mobile display, derived analytics and AI explanations, paper/mock-trading valuation, storage/cache/retention, exports, onward redistribution, permitted user population, data sources, latency, historical depth or fees. Keep the rights status **UNKNOWN — no integration or onboarding** until a source-specific written proposal and agreement explicitly cover each intended use. No demo, account, subscription or commercial contact has been initiated in this run.

### Ticker Data Ltd: legal-entity match not established

The NSE vendor roster names **Ticker Data Ltd**. A similarly named public website, tickerdata.com, identifies its operator in its Terms of Service as **TickerData LLC** in Tennessee. The public materials reviewed do not establish that this LLC is the same legal entity as the NSE roster entry. Do not attribute tickerdata.com products, terms or data rights to the NSE-listed Ticker Data Ltd without first verifying the legal contracting entity and its authority for the specific feed.

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
| TrueData | NSE roster lists CM coverage; its API page describes real-time and historical market-data APIs | Public API page restricts data to internal use, requires separate exchange/TrueData approvals for client/public display, and expressly prohibits paper/mock/simulated trading and model portfolios | **NOT APPROVED for paper trading; public display requires separate written approvals** |
| Global Financial Datafeeds | NSE roster lists CM coverage; WebSocket/REST and other APIs are documented | Standard API guidance is personal-use only; published API terms restrict to a single subscriber and exclude virtual/simulation use unless stated exchange/SEBI approvals are obtained; commercial use requires exchange agreements and fees | **NOT APPROVED under standard API terms for shared service or paper simulation** |
| Spider Software | NSE roster lists CM coverage; live-data analysis software is documented | Published subscription is single-terminal, non-assignable and expressly prohibits redistribution of data from its software | **NOT APPROVED under published standard subscription for shared service** |
| NSE Cogencis Enterprise Solutions | Enterprise Data Platform and open API for enterprise applications are documented | Public pages do not specify StockSamjho multi-user display, derived, paper-trading, storage or redistribution rights | **UNKNOWN — priority enterprise due diligence; no integration** |
| Ticker Data Ltd | NSE roster includes this legal name | A similarly named tickerdata.com site identifies TickerData LLC; legal-entity mapping to the NSE roster entry is not established | **UNKNOWN — do not conflate entities** |
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
- Do not use TrueData data to price the existing paper portfolio or run simulations under its published API restrictions. Treat it as a possible internal-analysis candidate only after the exact API contract, data scope, storage rights and exchange permissions are confirmed in writing.
- Do not use Global Datafeeds' standard API plan for a shared StockSamjho feed or paper/simulation use under its published single-subscriber and approval conditions.
- Do not redistribute Spider Software data or repurpose a single-terminal subscription for StockSamjho users under its published terms.
- Keep Cogencis Enterprise Solutions at `UNKNOWN`; public enterprise API capability is not a substitute for a written StockSamjho-specific licence covering display, derived analytics, simulations, storage and redistribution.
- Do not treat tickerdata.com / TickerData LLC as the NSE roster's Ticker Data Ltd unless the legal-entity relationship is independently verified.
- Do not use a broker's customer-specific token as a shared StockSamjho service credential.
- Do not change the ₹5,00,000 browser-local paper portfolio, its accounting, or its manual-price-mark behavior as part of this rights audit.
- No provider adapter, ingestion, cache, database, API activation, credential, account, subscription, agreement or purchase is introduced here.
- No strategy, scanner rule, candidate definition, frozen research/holdout architecture, strategy parameter or backtest mathematics is changed.

This is an engineering source-readiness record, not legal advice. Obtain qualified legal/compliance review of the actual agreement and applicable exchange/regulatory requirements before onboarding any source.
