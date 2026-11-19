# StockSamjho Market-Data Provider Rights Audit

**Review date:** 2026-11-15; **BharatStock Terms/API/PIT re-verified:** 2026-11-19  
**Status:** Public-document research only; no provider is authorized or configured  
**Scope:** Candidate broker APIs and exchange-authorised vendor routes for StockSamjho's internal analysis, end-user display, derived analytics and local paper-trading experience

## Executive decision

Do **not** connect a retail broker API to StockSamjho as a general market-data source merely because it exposes quotes, candles or a low-cost/free developer API.

The public terms reviewed for FYERS and Zerodha contain material restrictions that conflict with at least some of StockSamjho's intended use cases. Angel One's official SmartAPI forum moderator also directly rejects redistribution of broker price-feed data from a retail account to other users. Dhan's API documentation distinguishes individual users building their own algorithms/trading systems from partner platforms serving users, but Dhan's support FAQ explicitly says paper trading with virtual funds and live market data is not supported. Dhan is therefore **NOT APPROVED for the existing StockSamjho virtual paper portfolio**, even if the feed is fetched by one individual. Its individual API category may be relevant to private, non-simulation analysis, but exact storage, caching and derived-use rights for a private StockSamjho app still need written clarification. Upstox's public material reviewed here does not establish the exact multi-user display, derived-analytics, storage/cache, redistribution and paper-trading rights StockSamjho would need. Zerodha Kite Connect's public terms expressly prohibit using API/live market data for virtual/mock trading apps; its paid Connect tier is listed at ₹500/month per API key, which does not change that restriction. FYERS' API terms likewise expressly prohibit using exchange data for paper/virtual trading and restrict third-party API use. Twelve Data's published usage guidance distinguishes individual/internal plans from business plans; its express simulated-trading carve-out is limited to student competitions on the Venture plan, while non-US commercial display requires additional approval and redistribution a separate agreement. None is a presently approved source for the StockSamjho simulator or multi-user feed. A technical endpoint or subscription price is not a data licence.

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

Zerodha's support material also describes Kite Connect as an execution suite rather than a market-data vending service for other platforms: [Can I use historical and live data from Kite Connect API on other platforms?](https://support.zerodha.com/category/trading-and-markets/general-kite/kite-api/articles/can-i-use-historical-and-live-data-taken-from-kite-connect-api-on-other-platforms). The paid Connect tier is currently listed at **₹500/month per API key** and includes real-time WebSocket and historical candle data: [Kite Connect API pricing](https://support.zerodha.com/category/trading-and-markets/general-kite/kite-api/articles/what-are-the-charges-for-kite-apis). This is a technical subscription price, not permission to use the feed in a virtual/mock-trading app or display it publicly.

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
- [DhanHQ Data API access and pricing](https://dhan.co/support/platforms/dhanhq-api/how-to-access-dhan-api/)
- [DhanHQ live market-data features](https://dhan.co/support/platforms/dhanhq-api/how-can-i-access-live-market-data-through-dhan/)
- [DhanHQ FAQ: paper trading with virtual money and live market data](https://dhan.co/support/platforms/dhanhq-api/can-i-test-my-trading-strategy-with-virtual-money-before-going-live/)
- [DhanHQ API authentication — Individual and Partner categories](https://dhanhq.co/docs/v2/authentication/)
- [DhanHQ API Partner Declaration](https://survey.dhan.co/api-partner-declaration-mar25)
- [DhanHQ Terms & Conditions](https://dhanhq.co/terms/)

Dhan's official API authentication documentation defines two user categories:

- **Individual:** a Dhan account holder building their own algorithm or trading system on DhanHQ APIs.
- **Partner:** a platform that builds on DhanHQ APIs to serve its own users, such as an algo platform, fintech, bank or PMS.

Dhan's support pages state that its Data API subscription costs ₹499 plus applicable taxes per month and provides live market feed, live quotes, historical data and intraday data. However, Dhan's own FAQ titled **“Can I test my trading strategy with virtual money before going live?”** answers **“No”**: paper trading with virtual funds and live market data is not supported, and it states that paper trading is not permitted. The API documentation separately directs platforms serving users to the Partner route. A personal API subscription must not be treated as a partner or redistribution licence.

**StockSamjho assessment:** **NOT APPROVED for the existing ₹5,00,000 virtual paper portfolio, simulated trades or virtual-position valuation using Dhan live market data**, regardless of whether only one individual operates the simulator. This restriction follows Dhan's published FAQ and is not cured by buying the ₹499 individual Data API subscription. For private, non-simulation analysis, the Individual category may be relevant, but the reviewed public material does not fully settle storage, caching, derived analytics or embedding data in a private StockSamjho instance; obtain written clarification before using it for those purposes. Any StockSamjho service that serves other users must be discussed with Dhan through its Partner route, with written product-specific permissions. Do not subscribe, activate credentials, submit a partner declaration, create an account or integrate as part of this audit.

### Upstox

**Official sources:**
- [Upstox Developer API overview](https://upstox.com/developer/api-documentation/)
- [Market Data Feed V3](https://upstox.com/developer/api-documentation/v3/get-market-data-feed/)
- [Analytics Token announcement](https://upstox.com/developer/api-documentation/announcements/analytics-token/)

The developer documentation describes quote, historical-candle, option-chain, market-information, fundamentals, news and WebSocket data surfaces. The Analytics Token is described as read-only; that is an API permission boundary, not a market-data redistribution licence.

**StockSamjho assessment:** Technical capability is documented, but public display, multi-tenant use, derived analytics, storage/cache, redistribution and paper-trading rights were not established by the public API pages reviewed. Keep rights **UNKNOWN**. Do not create an app, request tokens or integrate until the applicable legal terms and any required exchange/vendor permissions are verified for the exact StockSamjho use.

### Twelve Data: individual plans are internal-use only; simulation carve-out is narrow

**Official sources:**
- [Twelve Data Terms of Use (last updated 1 January 2026)](https://twelvedata.com/terms)
- [Commercial and personal usage](https://support.twelvedata.com/en/articles/5332349-commercial-and-personal-usage)
- [Attribution guidelines](https://support.twelvedata.com/en/articles/12647398-attribution-guidelines)

The Terms of Use define **Internal Use** as use solely for the customer's internal business purposes and not for redistribution or external commercial purposes. The standard data licence permits processing and storage for Internal Use; third-party display and redistribution require the applicable subscription tier, a Redistribution Rights Add-On or a separate written agreement. Third-party market data may also require direct agreements, exchange fees and compliance with source-specific restrictions.

Twelve Data's commercial/personal usage guidance distinguishes:

- **Individual plans (Grow, Pro, Ultra):** intended strictly for personal or internal use. They do not permit redistribution or commercial display to third parties.
- **Venture / business plans:** may permit commercial display and internal use, subject to exchange licensing. Price data for regions outside the United States requires additional approval for commercial use. Redistribution requires a separate agreement with Twelve Data.
- **Derived data:** indicators, scores and aggregates may be computed/stored if they cannot be reverse-engineered to reconstruct the source data; public display of derived data requires attribution.
- **Simulation exception:** the published guidance mentions simulated trades in **student competitions** only on the Venture plan, provided raw data is not redistributed. It does not grant a general paper-trading or virtual-portfolio right for StockSamjho.

**StockSamjho assessment:** **NOT APPROVED for the existing ₹5,00,000 virtual portfolio or simulated trading under the published individual-plan terms.** The student-competition carve-out is not a general personal paper-trading permission. Twelve Data may be a future commercial due-diligence candidate for internal analytics and/or display only if it confirms the relevant Indian exchange coverage, exchange-specific approvals, Venture/Enterprise scope, derived-data rights, attribution, redistribution add-on/agreement, retention and fees in writing. The public guidance does not establish that a suitable NSE commercial licence fits the ₹2,000/month target. Do not create an account, use a trial, subscribe or integrate as part of this audit.

### BharatStock: low-cost candidate for statutory disclosures and derived analytics only

**Official sources (initially reviewed 15 November 2026; Terms/API rechecked 19 November 2026):**
- [BharatStock product, API coverage and published pricing](https://bharatstockapi.com/)
- [BharatStock Terms & Conditions](https://bharatstockapi.com/terms)
- [BharatStock Data Sources](https://bharatstockapi.com/data-sources)
- [BharatStock API Reference](https://bharatstockapi.com/reference)
- [BharatStock Privacy Policy](https://bharatstockapi.com/privacy)
- [BharatStock builder discussion and operator's public response (23 October 2026)](https://www.reddit.com/r/indiandevs/comments/1xd04ir/we_built_bharatstock_bharatstockapicom_a_clean/)

The product page advertises an end-of-day REST API (not a live/tick feed), with company financials, shareholding, corporate actions, insider/PIT disclosures, mutual-fund data and NSE/BSE EOD prices. Its data-sources page attributes prices to NSE/BSE, company financial and shareholding disclosures to company/SEBI filings, and mutual-fund NAV/holdings to AMFI and AMC disclosures.

Published monthly prices, exclusive of applicable tax, are Starter ₹500 (1,000/day), Growth ₹800 (5,000/day), Developer ₹1,200 (10,000/day) and Pro ₹5,000 (40,000/day), as checked on 19 November 2026. The Developer tier required for the documented financials `as_of` filter is ₹1,200/month before tax, within the ₹2,000/month target at list price. Plans are quota/history tiers, not a per-seat price; however, Terms §7 bind each API key to its registered user/entity and prohibit key sharing. Paid-tier Permitted Display applies only to listed datasets and genuine Customer Derivatives. This is not a blanket multi-user redistribution, exchange-price display or AI-model licence.

**Material terms and limitations:**
- **Current Terms §§5, 7–9, 11 and 13 (re-verified 19 November 2026)** define Internal Use, Customer Derivatives, Permitted Display and Redistribution License. On a paid tier, public display is expressly listed for company financials, shareholding patterns, corporate actions, insider/PIT disclosures, mutual-fund holdings/NAV, genuine Customer Derivatives and identifiers, subject to attribution, an active subscription and underlying third-party terms.
- **Current Terms §§8, 10 and 11** distinguish Exchange Data from Statutory Data. Public display of raw/adjusted NSE/BSE EOD prices, OHLCV, index values, bulk/block deals and FII/DII requires the customer's own direct exchange display/redistribution licence; BharatStock does not pass one through. Statutory financials, shareholding, corporate actions and insider disclosures are treated separately, but the terms expressly disclaim that every dataset is free of third-party rights.
- The operator's public Reddit response on 23 October 2026 said it was working toward incorporating the entity and obtaining an exchange data-feed licence, including for EOD data. That is a historical public statement, not proof that a licence has since been obtained. No current exchange authorisation or licence for StockSamjho's use was verified in this review. Treat all exchange-sourced price/indices/deals/flows as **NOT APPROVED** pending current written proof of the upstream rights and the exact downstream permission.
- API keys are bound to the registered user/entity and must not be shared. Keep any key server-side. The terms allow the provider to require disclosure of public/client end-user display and business verification. They say no self-serve white-label/redistribution tier is offered.
- Caching/storage and public serving are conditional on an active paid subscription. On lapse/termination, the terms require stopping public serving and removing cached data from public-facing surfaces within 30 days; private internal records may be retained subject to the terms.
- **Current Terms §24** explicitly permit an AI agent/application to retrieve data at request time to answer a user query or drive a workflow. However, the same clause limits Developer/Pro model evaluation/backtesting to personal/internal purposes and requires a separate written Model Training License for using data to train, fine-tune, ground, embed, or evaluate/build a model, product or service that is distributed, licensed, sold or embedded for third parties. Because StockSamjho is a commercial AI product, request-time retrieval for user answers versus RAG/LLM grounding and customer-facing model evaluation must be clarified in writing before any integration.
- **Current Terms §5** define “Competing Product” broadly to include a product, service, dataset, feed, API, index, score or model providing the same or substantially similar data, feeds or insights. This may capture parts of StockSamjho's stock-analysis product; obtain a written carve-out/confirmation that its proposed analysis, scores and user-facing insights are not treated as a competing product.
- The current Terms still identify the Platform Owner only as “BharatStock, a sole proprietorship”; the reviewed page does not name the proprietor or provide a full contracting address. Verify the contracting legal identity, invoice/GST issuer and upstream source-rights chain before relying on a paid contract.
- **Current Terms §§16–18** describe data as EOD/historical/cached, disclaim accuracy/timeliness/suitability warranties and do not commit to uptime or an SLA unless separately signed. StockSamjho must independently handle stale/incomplete data; request a written SLA only if the product requires one.
- **Current Terms §27** adds a material remedy for unauthorised redistribution, competing-product use or unlicensed model training/grounding/evaluation: liquidated damages equal to the greater of three times annual fees, ₹10 per affected record, or the fees for rights actually exercised, plus possible injunctive relief. This makes written, use-case-specific permission essential.
- **PIT / revision limitation (re-verified 19 November 2026):** The API Reference now documents `as_of=YYYY-MM-DD` on the financials endpoint (Developer plan and above). It filters to periods that had ended and whose results had been filed with the exchange on or before the requested date; periods with no known filing date are excluded by default. Crucially, the same Reference explicitly says the returned figures are the values BharatStock holds today for those periods, including later corrections—not a snapshot of what was first published. It also states that `filed_date` is the original first-filing date and does not move when a later revised or re-filed copy is returned. The public homepage FAQ is internally inconsistent: the earlier item “Can historical records be revised later? Is there a snapshot mechanism?” still says “We don't expose a point-in-time/as-of snapshot API”, while a later FAQ answer says Developer/Pro supports `as_of` for filing eligibility and the API Reference documents the same parameter. Read the earlier answer narrowly as saying that no immutable historical-value snapshot exists; it is stale if read as denying the filing-date filter. The later FAQ and API Reference still make clear that returned figures are the values held today, including later corrections, not the values actually available on the requested date. Ask the provider to reconcile this public documentation before onboarding. The API Reference changelog records multiple corrections to historical financial rows on 18 November 2026. On 19 November 2026, it also reported a coverage expansion: financial history now reaches FY2015-16, with about 39,000 older quarterly and annual periods added from exchange filings and missing EPS filled on about 6,300 existing periods where the filed EPS reconciles with profit and share count. For the 500 largest NSE companies (counting only years each was listed), the provider reports annual coverage of 92% of years (up from 81%), quarterly coverage since 2016 of 94% (up from 89%), and 90% of annual periods carrying EPS, revenue and net profit together (up from 74%); FY2017-18 annual results are now present for 244 of those companies. The same day's changelog reports full statements of profit and loss as filed for 18 periods that previously carried third-party summaries, plus paid-up-equity-capital corrections or fills for about 44 periods across 29 companies. It notes that balance-sheet lines still start at FY2022-23 for most companies because earlier exchange filings are not machine-readable. These are provider-reported coverage and normalization changes, not an independent completeness audit or immutable revision history. The changelog also records the FMEC correction for the quarter ended 30 September 2026: paid-up equity capital had been 100,000× too high and was corrected to 97,809,448, while face value per share was filled as 2; the provider says the same check now runs on every new filing. This is another example of current historical values changing without a corresponding revision-availability timestamp being exposed. Therefore, `as_of` can filter out periods not yet filed by a historical date, but it cannot reconstruct the value revision that was actually available on that date; revision availability and lineage remain unproven. Do not treat `as_of`, `filed_date`, `source`, `period_end_date`, `consolidation_type` or `statement_format` as proof of immutable historical value state. A StockSamjho-side capture proves only when StockSamjho first observed a payload, not when the source first published or revised it. Keep `PIT_UNKNOWN` / `UNAVAILABLE` for PIT-sensitive analysis until immutable primary documents with independently verifiable publication/availability timestamps, or a documented provider revision/snapshot-history contract, are supplied. Sources: [BharatStock API Reference — financials `as_of` and `filed_date`](https://bharatstockapi.com/reference), [BharatStock FAQ — historical revisions and point-in-time data](https://bharatstockapi.com/), and [API Reference changelog — 18–19 November 2026 corrections](https://bharatstockapi.com/reference).

**StockSamjho assessment:** **CONDITIONAL — statutory-disclosure data and genuine derived analytics only; NOT APPROVED for raw exchange-price display, paper-portfolio valuation or canonical PIT-sensitive analysis; AI/model-use rights remain UNKNOWN.** The current Developer list price of ₹1,200/month before tax is within the ₹2,000/month target, but price alone does not establish legal or technical suitability. Do not use exchange prices to mark the ₹5,00,000 paper portfolio, show raw OHLCV/charts, or enable a provider adapter under the current evidence. Before any future onboarding, obtain written confirmation of the legal contracting entity; statutory dataset provenance and end-user display rights; whether the specific StockSamjho analytics are permitted Customer Derivatives and non-competing; request-time LLM retrieval versus RAG/grounding and customer-facing model evaluation; any model-evaluation/backtesting scope; paper/virtual-portfolio valuation; retention and termination handling; request quota; and all taxes/fees. No account, API key, trial, subscription, quote request, purchase or integration is initiated by this audit.

### TejHQ: commercial EOD use is outside budget and upstream exchange rights are unconfirmed

**Official source:** [TejHQ data terms, updated 8 November 2026](https://tejhq.dev/data-terms).

TejHQ says its EOD dataset is built from NSE/BSE bhavcopy and corporate-action files, but expressly states that it holds **no licence from NSE, BSE or NSE Indices and has no written clarification from them**. Its terms distinguish personal use (including private research, backtesting and paper trading) from commercial use for a business, app or other people. Commercial use requires Pro at ₹4,999/month or Team at ₹24,999/month; raw data publishing/resale is prohibited, while non-reconstructable derived research outputs may be published. Its paid commercial plan therefore exceeds the ₹2,000/month target and does not cure the stated absence of exchange licensing/clarification.

**StockSamjho assessment:** **NOT APPROVED** as a commercial StockSamjho market-data source under the reviewed terms. Do not use the free, keyless or Retail plan in the commercial app, and do not treat its open-source code licence as a licence to the underlying exchange data. No account, key, trial, subscription, data ingestion or adapter is authorised.

## Cross-provider decision matrix

| Provider | Technical market-data API evidence | Restriction or unresolved right | StockSamjho decision |
|---|---|---|---|
| FYERS | Quotes, historical and real-time APIs are documented | Public terms restrict exchange-data use for charting/technical tools and paper/virtual trading; written consent is required for specified copying, caching and distribution | **NOT APPROVED** under public terms |
| Zerodha Kite Connect | Live and historical market-data APIs are documented; paid Connect is listed at ₹500/month per API key | Public display and virtual/mock trading are prohibited under standard terms; redistribution/copy/cache is restricted | **NOT APPROVED** under public terms |
| Angel One SmartAPI | Live quotes, historical data, streaming and instrument-master APIs are documented | SmartAPI moderator says retail-account price-feed data cannot be further redistributed to other users; personal use is a separate scope | **NOT APPROVED** as a shared StockSamjho feed |
| DhanHQ | Data API at ₹499 + applicable taxes/month; official docs distinguish Individual and Partner users | Dhan's support FAQ says paper trading with virtual funds and live market data is not supported; other-user/platform rights require the Partner route and written terms | **NOT APPROVED for virtual paper trading; private non-simulation analysis only after written clarification** |
| Upstox | Quote, historical, fundamentals and streaming APIs are documented | Exact multi-user/display/derived/storage/redistribution/paper-trading rights not verified in the API pages reviewed | **UNKNOWN — no integration** |
| Twelve Data | Market-data APIs and Individual/Venture/Enterprise plans are documented | Individual tiers are internal-use only; student-competition simulation carve-out is narrow; non-US commercial display needs exchange approval and redistribution a separate agreement | **NOT APPROVED for StockSamjho paper trading; commercial use requires written licensing review** |
| TrueData | NSE roster lists CM coverage; its API page describes real-time and historical market-data APIs | Public API page restricts data to internal use, requires separate exchange/TrueData approvals for client/public display, and expressly prohibits paper/mock/simulated trading and model portfolios | **NOT APPROVED for paper trading; public display requires separate written approvals** |
| Global Financial Datafeeds | NSE roster lists CM coverage; WebSocket/REST and other APIs are documented | Standard API guidance is personal-use only; published API terms restrict to a single subscriber and exclude virtual/simulation use unless stated exchange/SEBI approvals are obtained; commercial use requires exchange agreements and fees | **NOT APPROVED under standard API terms for shared service or paper simulation** |
| Spider Software | NSE roster lists CM coverage; live-data analysis software is documented | Published subscription is single-terminal, non-assignable and expressly prohibits redistribution of data from its software | **NOT APPROVED under published standard subscription for shared service** |
| NSE Cogencis Enterprise Solutions | Enterprise Data Platform and open API for enterprise applications are documented | Public pages do not specify StockSamjho multi-user display, derived, paper-trading, storage or redistribution rights | **UNKNOWN — priority enterprise due diligence; no integration** |
| Ticker Data Ltd | NSE roster includes this legal name | A similarly named tickerdata.com site identifies TickerData LLC; legal-entity mapping to the NSE roster entry is not established | **UNKNOWN — do not conflate entities** |
| BharatStock | EOD REST API for prices plus statutory financials, shareholding, corporate actions, insider disclosures and AMFI/AMC mutual-fund data; published Starter ₹500 / Developer ₹1,200 per month; Developer+ `as_of` filing-date filter | Paid terms permit listed statutory-data and genuine Customer Derivative display, but exclude public exchange-price display without a direct exchange licence; `as_of` filters filing eligibility but returns today's values, including later corrections, not historical value snapshots; AI grounding/distributed model use and broad Competing Product scope need written clarification | **CONDITIONAL for statutory disclosures/derived analytics only; NOT APPROVED for exchange prices, paper valuation or PIT-sensitive canonical evidence** |
| TejHQ | EOD API and Parquet dataset built from NSE/BSE bhavcopy and corporate-action files | Terms say no NSE/BSE/NSE Indices licence or written clarification; commercial Pro ₹4,999/month and Team ₹24,999/month; raw-data redistribution prohibited | **NOT APPROVED for commercial StockSamjho use** |
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
- Do not use Dhan Data API live market data to value the ₹5,00,000 virtual paper portfolio or to run paper/simulated trades; Dhan's published FAQ explicitly says paper trading with virtual funds and live market data is not supported.
- Keep Dhan's Individual API category separate from its Partner integration route. For private, non-simulation analysis, obtain written confirmation of the exact data use, storage, caching and derived-analytics rights. Any StockSamjho service serving other users requires the Partner route and product-specific written permissions.
- Keep Upstox at `UNKNOWN` until its complete current terms and exact written permissions are verified.
- Do not use Twelve Data Individual plans for StockSamjho's virtual paper portfolio or simulated trades. Treat Venture/Enterprise as a possible commercial due-diligence route only after Twelve Data confirms Indian exchange permissions, permitted display/derived-data scope, redistribution terms, retention and fees in writing.
- Do not use TrueData data to price the existing paper portfolio or run simulations under its published API restrictions. Treat it as a possible internal-analysis candidate only after the exact API contract, data scope, storage rights and exchange permissions are confirmed in writing.
- Do not use Global Datafeeds' standard API plan for a shared StockSamjho feed or paper/simulation use under its published single-subscriber and approval conditions.
- Do not redistribute Spider Software data or repurpose a single-terminal subscription for StockSamjho users under its published terms.
- Keep Cogencis Enterprise Solutions at `UNKNOWN`; public enterprise API capability is not a substitute for a written StockSamjho-specific licence covering display, derived analytics, simulations, storage and redistribution.
- Do not treat tickerdata.com / TickerData LLC as the NSE roster's Ticker Data Ltd unless the legal-entity relationship is independently verified.
- Keep BharatStock at **CONDITIONAL** only for paid-tier statutory disclosures and genuine non-reconstructable Customer Derivatives. Do not display its raw exchange prices/OHLCV/index/deals/flows, use them for paper-portfolio marks, or activate an adapter unless current upstream exchange rights and StockSamjho-specific permissions are evidenced in writing.
- Do not treat BharatStock's `as_of` filing-date filter or `filed_date` as a point-in-time value snapshot. The filter can establish period filing eligibility, but returned values may include later corrections. Without immutable revision snapshots and independently verifiable publication/availability timestamps, keep PIT-sensitive records at `PIT_UNKNOWN` / `UNAVAILABLE`.
- Before any BharatStock onboarding, resolve the contracting proprietor/legal entity, statutory-data source rights, public end-user display scope, Customer Derivatives/Competing Product interpretation, request-time LLM/RAG versus Model Training License boundary, commercial backtesting scope, paper-portfolio valuation, data retention and fees in writing.
- Do not use TejHQ's free/keyless/Retail plans for StockSamjho's commercial product. Its published Pro/Team pricing exceeds the target and its terms state that it has no exchange data licence or written exchange clarification.
- Do not use a broker's customer-specific token as a shared StockSamjho service credential.
- Do not change the ₹5,00,000 browser-local paper portfolio, its accounting, or its manual-price-mark behavior as part of this rights audit.
- No provider adapter, ingestion, cache, database, API activation, credential, account, subscription, agreement or purchase is introduced here.
- No strategy, scanner rule, candidate definition, frozen research/holdout architecture, strategy parameter or backtest mathematics is changed.

This is an engineering source-readiness record, not legal advice. Obtain qualified legal/compliance review of the actual agreement and applicable exchange/regulatory requirements before onboarding any source.
