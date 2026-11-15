# StockSamjho Commercial Data Vendor Follow-up: Ticker Data, Market Pulse and TrueData

**Review date:** 2026-11-15  
**Status:** Public-source due diligence only; no vendor has been contacted and no entitlement is approved  
**Budget target:** ₹2,000/month for multi-user commercial use  
**Scope:** NSE/BSE cash-equity data, web/mobile display, derived analytics, AI explanations, storage/cache and paper-portfolio valuation

## Executive decision

1. **Priority written-RFQ candidate: Ticker Data Limited.** The current NSE authorised real-time vendor roster lists Ticker Data Ltd with Capital Market coverage. Its own domain, tickermarket.com, identifies the company as Ticker Data Limited and publishes CIN U63999MH2023PLC406517. Its enterprise data-feed page explicitly describes APIs and integration into financial portals, broker websites and media; its API documentation describes domestic delayed, real-time, intraday and historical data. This is the strongest newly verified enterprise integration candidate in this follow-up. However, no public price or StockSamjho-specific downstream licence has been verified. It remains **CONDITIONAL — written quotation and contract required**.
2. **Market Pulse Technologies Private Limited is not usable under its retail-app terms.** It appears on the NSE authorised vendor roster, but its public Market Pulse app terms grant only a limited, non-assignable, non-transferable app licence and prohibit resale, permitting access to others and redistribution of market information. No separate enterprise API rights or StockSamjho multi-user licence were established. Do not repurpose the retail app or a retail subscription as a shared feed.
3. **TrueData Velocity Lite's low retail price is not an API licence.** The published pricing page lists Velocity Lite NSE EQ at ₹1,439.83/month, but explicitly says Velocity plans do not include API access and API access requires a separate application and approval. The previously reviewed TrueData API terms expressly prohibit paper/virtual/simulated trading. The retail Velocity price therefore does not solve StockSamjho's multi-user API or paper-portfolio requirements.

No provider is approved or configured. Keep `MARKET_DATA_ACCESS_POLICY.status = NOT_CONFIGURED`.

## Ticker Data Limited — priority enterprise RFQ

### Identity and exchange-vendor evidence

- The current [NSE Authorised Real Time Data Vendors roster](https://nsearchives.nseindia.com/web/sites/default/files/inline-files/Authorized_Realtime_Data_Vendors.pdf), reviewed 2026-11-15, lists **Ticker Data Ltd** with a Capital Market (CM) checkmark (row 21). The roster is evidence of vendor status and stated segment coverage only; it is not a downstream StockSamjho licence.
- The official [Ticker Data website](https://tickermarket.com/) identifies the operating company as **Ticker Data Limited**, with CIN **U63999MH2023PLC406517**.
- Ticker Data's official [Ticker Solutions — Datafeed](https://tickermarket.com/products/ticker-solutions.html) page describes enterprise data-feed solutions, feed handlers, object distributors and APIs, with integration into financial portals, broker websites and media. It also lists website integration, live and delayed streaming, chart APIs and strategy backtesting/portfolio-valuation use cases.
- Its official [DataWagen product listing](https://tickermarket.com/products/datawagen) identifies DataWagen as a market-data and analytics API suite.
- The official [Web API introduction](https://tickermarket.com/api/introduction.html) says the REST feed server provides domestic delayed, real-time, intraday and historical market-data APIs in JSON/XML and is intended for online brokerages, financial websites and institutions. The [production WebSocket documentation](https://www.tickermarket.com/api/production/dataServices_WS_ALL.html) describes streaming subscriptions and includes an NSE-equity example. These pages demonstrate technical capability, not permission for a specific StockSamjho use.
- The company's official contact page lists **info@tickermarket.com** and **+91 22 6686 6060**. A corporate notice on the same official domain lists **connect@tickerdata.in** and CIN U63999MH2023PLC406517.

### Correction to the earlier entity note

The earlier audit correctly warned not to conflate the unrelated-looking **TickerData LLC** identity on tickerdata.com with the NSE roster's Ticker Data Ltd. This follow-up independently identifies the actual NSE-listed **Ticker Data Limited** through its own official tickermarket.com domain and corporate CIN. Do not use tickerdata.com as a substitute for this company, and do not infer that a similarly named LLC shares its rights.

### What remains unknown

No public source reviewed establishes:
- StockSamjho's right to display raw NSE/BSE data to multiple end users on web/mobile;
- permitted customer/user counts, concurrent sessions, per-user exchange fees or minimum commitments;
- derived analytics, indicators, rankings, screener results or AI-generated explanations;
- LLM/RAG retrieval, model grounding/training or storage of source material;
- paper/mock/virtual trading, model portfolios or simulated-position valuation;
- raw data exports, customer APIs, caching, retention, backups, onward redistribution or sublicensing;
- exact NSE/BSE segments, instrument universe, latency, historical depth, corporate-action adjustment policy, rate limits or total price.

**Decision:** Make Ticker Data Limited the first enterprise RFQ candidate, but do not connect it until the contracting entity supplies a written quotation and a draft agreement expressly covering the intended product and every relevant use. No public price was found, so it cannot yet be called the cheapest or within ₹2,000/month.

## Market Pulse Technologies Private Limited — retail-app terms do not permit sharing

- The NSE authorised vendor roster lists **Market Pulse Technologies Private Ltd** with a CM checkmark (row 12); the same row also has F&O and CD checkmarks. This is vendor-roster evidence only.
- Its official [contact page](https://api.market-pulse.in/contact-us) identifies Market Pulse Technologies Private Limited and CIN **U74999MH2016PTC285256**.
- Its published [Terms of Use](https://www.market-pulse.in/terms_of_service) grant a limited, non-exclusive, non-assignable and non-transferable licence to access the application. The terms prohibit deep-linking, resale or permitting access to others without prior written consent (lines 7–11). The Market Information section says users must not redistribute or facilitate redistribution, or provide access to unauthorised recipients (lines 39–43).
- These are the retail application's terms. They do not prove that a separate B2B data-feed product is unavailable, but no public StockSamjho-specific enterprise API or redistribution permission was found in this review.

**Decision:** **NOT APPROVED under the retail-app terms** as a shared StockSamjho data source. Only consider a separate enterprise feed if Market Pulse confirms in writing the upstream exchange authority, product/API, multi-user web/mobile display, derived/AI uses, paper simulation, storage/cache and redistribution rights. Do not use the retail app, screen scraping or a retail login as a feed.

## TrueData — low retail price is not a commercial API quote

- The official [TrueData pricing page](https://www.truedata.in/information/pricing) lists **Velocity Lite — NSE EQ at ₹1,439.83/month**.
- The same page explicitly states: **Velocity plans do not include API access; API access requires a separate application and approval.**
- The previously reviewed [TrueData Market Data API compliance page](https://www.truedata.in/market-data-apis) and [Terms & Conditions](https://www.truedata.in/terms-and-conditions) describe separate approvals for public/client display and expressly prohibit paper/virtual/simulated trading under the published API restrictions.

**Decision:** Do not treat ₹1,439.83/month as a StockSamjho API or multi-user commercial price. Do not use Velocity Lite for the app's shared feed or paper portfolio. Any separate API proposal would need its own written quotation and rights review.

## RFQ priority and exact questions

1. **Ticker Data Limited** — first RFQ, because its official enterprise material describes portal/broker-site integration and it is listed on the NSE CM vendor roster.
2. **Market Pulse Technologies Private Limited** — secondary enquiry only if it offers a distinct enterprise feed, not the retail app.
3. **TrueData** — only a separate API/commercial proposal; ignore the Velocity retail price for this purpose.

For each written quotation, request:
- exact legal contracting entity and product/API version;
- NSE/BSE cash-equity coverage and whether NIFTY 500 is included;
- delayed/EOD and live options, historical depth, latency and symbol limits;
- multi-user commercial web/mobile display rights and exact user/concurrency caps;
- raw data display versus derived analytics, indicators and AI explanations;
- explicit LLM/RAG, model-grounding/training and data-retention permissions;
- explicit paper/mock/virtual trading and simulated-position valuation permission;
- storage, caching, backups, exports, customer APIs and redistribution rights;
- setup fees, minimum annual commitment, per-user/per-symbol/exchange charges, taxes and all other costs;
- written confirmation of all upstream exchange approvals and restrictions.

Ask for the lowest legally permitted scope that can fit the ₹2,000/month target, including a limited symbol universe or delayed/EOD tier if full NIFTY 500/live rights are unaffordable. Do not infer that a quote, API key or technical connection grants rights not stated in the executed agreement.

## Current implementation gate

- `MARKET_DATA_ACCESS_POLICY.status` remains `NOT_CONFIGURED`; protected routes must remain fail-closed.
- No provider adapter, ingestion, cache, API activation, account, credential, trial, subscription, purchase, agreement or entitlement was created.
- The ₹5,00,000 browser-local paper portfolio, its accounting and manual price marks remain unchanged. No live trading or broker orders.
- No frozen research/holdout architecture, candidate definition, strategy parameter, scanner rule or backtest mathematics was changed.
- This is engineering due diligence, not legal advice. Obtain qualified legal/compliance review of the actual agreement before onboarding.

## Sources reviewed

- NSE [Authorised Real Time Data Vendors roster](https://nsearchives.nseindia.com/web/sites/default/files/inline-files/Authorized_Realtime_Data_Vendors.pdf)
- NSE [Data Sharing & Usage Policy](https://www.nseindia.com/static/market-data/nse-data-policy)
- Ticker Data Limited [official website](https://tickermarket.com/), [Ticker Solutions — Datafeed](https://tickermarket.com/products/ticker-solutions.html), [DataWagen](https://tickermarket.com/products/datawagen), [Web API introduction](https://tickermarket.com/api/introduction.html), [production WebSocket API documentation](https://www.tickermarket.com/api/production/dataServices_WS_ALL.html), [contact page](https://tickermarket.com/mvtsetup-download.html), and [corporate notice with CIN/contact](https://tickermarket.com/assets/images/documents/EOGM_Notice_Ticker_Data_05.08.24.pdf)
- Market Pulse [Terms of Use](https://www.market-pulse.in/terms_of_service) and [corporate contact page](https://api.market-pulse.in/contact-us)
- TrueData [pricing](https://www.truedata.in/information/pricing), [API compliance](https://www.truedata.in/market-data-apis) and [Terms & Conditions](https://www.truedata.in/terms-and-conditions)
