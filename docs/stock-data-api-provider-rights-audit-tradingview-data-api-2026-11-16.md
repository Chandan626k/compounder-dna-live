# Third-Party TradingView Data API — Commercial Rights and India Coverage Audit

**Review date:** 2026-11-16  
**Status:** Public-document research only; not approved or configured for StockSamjho  
**Scope:** Independent service marketed as “TradingView Data API” at tradingviewapi.com. This is not TradingView, Inc. and must not be confused with TradingView's official products.

## Executive decision

The independent TradingView Data API is a **low-priced due-diligence lead, not a legally cleared StockSamjho source**.

Its published Terms of Service say the provider permits commercial display, redistribution, caching and forwarding of API responses within plan limits. The public Pro plan is listed at USD 10/month for 40,000 REST requests and 5 requests/second; Ultra is USD 30/month for 160,000 requests and adds WebSocket/SSE. Those list prices are below the project's ₹2,000/month target in nominal USD terms before exchange conversion, taxes and any other charges.

That apparent price fit does not establish that the service can lawfully supply the Indian exchange data StockSamjho needs. The provider's own terms say it is not affiliated with or officially licensed by TradingView, Inc.; its market data comes from unnamed upstream suppliers; the terms expressly say the plan is not an exchange licence and the provider gives no written indemnification for display or redistribution. The reviewed public pages do not identify the upstream suppliers, the contracting legal entity/jurisdiction, an NSE/BSE authorization chain, or an India/NIFTY 500 coverage commitment. The API's terms also do not expressly settle StockSamjho's intended paper/simulated trading valuation or AI-derived analytics.

**Decision: RIGHTS_UNKNOWN / NOT_APPROVED.** Do not create an account, request a key, make API calls, subscribe, integrate, cache, display or use this feed for paper marks. A written vendor response and source-specific evidence are required first.

## What the provider publishes

### Product and price

Official provider pages reviewed 16 November 2026:

- [TradingView Data API pricing](https://www.tradingviewapi.com/pricing/) — the page says prices are current as of 15 November 2026.
- [API documentation](https://www.tradingviewapi.com/docs/).
- [Provider home page](https://www.tradingviewapi.com/).

The public monthly plans shown are:

| Plan | Public list price | Published REST quota | Streaming |
|---|---:|---:|---|
| Basic | USD 0 | 200 requests/month on the pricing comparison table; trial limits/features are separately described | Trial only |
| Pro | USD 10/month | 40,000 requests/month; 5 requests/second | REST only |
| Ultra | USD 30/month | 160,000 requests/month; 5 requests/second | WebSocket and SSE |
| Mega | USD 80/month | 1,000,000 requests/month; 10 requests/second | WebSocket and SSE |

The provider describes a 10-symbol batch limit for quote and price requests. It also states that latency follows the listing exchange rather than the subscription tier. Public list prices are not a StockSamjho quotation and do not include a confirmed INR conversion, applicable taxes, or a negotiated multi-user/data-rights schedule.

The provider advertises 160,000+ symbols and 353+ exchanges (including 250+ equity venues). The marketing page's illustrative exchange strip names venues such as NASDAQ, NYSE, SSE, HKEX, LSE, TSX and ASX. The public pages reviewed do **not** provide a dated NSE/BSE instrument list, a NIFTY 500 coverage guarantee, a completeness report, or a source-specific India coverage schedule. A global symbol-count claim is not evidence of Indian coverage.

### Commercial use language

The provider's [Terms of Service](https://www.tradingviewapi.com/terms/) (last updated 20 August 2026) state that, subject to plan limits, users may use responses in commercial products and may display, redistribute, cache and forward responses to their own end users. The same terms say this permission is not an exchange licence or a warranty that downstream use is lawful in every jurisdiction.

The terms also state:

- The service is independent and is not affiliated with, endorsed by, or officially licensed by TradingView, Inc.
- Market data is sourced from upstream suppliers, but the reviewed terms do not name those suppliers or identify the relevant exchange agreements.
- The provider gives no written indemnification, hold-harmless or defence obligation for display, redistribution or commercial use.
- Data is supplied as-is/as-available; completeness, real-time availability and fitness for automated trading are not warranted.
- The public product is standardized; the provider says it does not sell a separately engineered enterprise feed or custom endpoints. Larger-volume quotes are described as quota/price changes, not a new data product.

The provider's [Privacy Policy](https://www.tradingviewapi.com/privacy/) identifies “TradingView Data API” as the operator and lists a support email, but the reviewed page does not identify a registered contracting legal entity, registration number, jurisdiction or business address. This must be resolved before contracting or paying.

### Data quality and product-fit gaps

The public docs describe quotes, OHLCV, technical analysis, screeners, financial statements, news and calendars. They do not, by themselves, establish the evidence needed for StockSamjho's financial and market-data gates:

- named upstream supplier and its authority for each Indian venue/segment;
- NSE/BSE exchange rights and the downstream multi-user display/redistribution chain;
- NIFTY 500 constituents and dated security-master coverage, including exact exchange symbols, series and durable identifiers;
- market timestamp, publication timestamp, fetch timestamp, timezone, session and delayed-versus-real-time status for each record;
- currency, price/volume units, corporate-action adjustment basis and historical revision semantics;
- authoritative issuer mapping and filing provenance, point-in-time availability, publication dates and source revisions for fundamentals;
- explicit rights for AI processing, derived analytics, retention/cache, exports and paper/mock-trading/model-portfolio valuation.

Do not infer these from the advertised number of exchanges, a successful API call, a symbol-search result, or the word “commercial” in the provider's own terms.

## StockSamjho assessment

| Requirement | Public evidence reviewed | Decision |
|---|---|---|
| Price within ₹2,000/month | USD 10 Pro list price; no confirmed INR invoice/tax/FX or StockSamjho quotation | Price lead only |
| Multi-user commercial display and redistribution | Provider terms grant display/redistribution within plan limits | Provider-side wording exists; upstream rights remain unproven |
| NSE/BSE source authority | No named upstream supplier or source-specific Indian exchange agreement found | UNKNOWN |
| NIFTY 500 coverage | No dated NSE/BSE/NIFTY 500 coverage schedule found | UNKNOWN |
| Paper/simulated trading valuation | No explicit permission found in the reviewed terms | UNKNOWN / not approved |
| AI-derived analytics and explanations | No explicit StockSamjho-specific AI/derived-use permission found | UNKNOWN |
| Storage, caching and retention | Provider terms permit caching/forwarding, but no upstream retention rights or source-specific limits are disclosed | UNKNOWN |
| PIT financial evidence and issuer identity | No independently validated Indian filing/issuer evidence chain established | UNKNOWN |
| Contracting counterparty and remedies | Legal entity not identified on reviewed privacy page; no written indemnity | Unresolved material risk |

The service's own commercial-use permission cannot grant rights that its unnamed upstream suppliers or exchanges have not granted. It therefore cannot currently replace an NSE/BSE-authorized vendor or be treated as the cheapest legally suitable source.

## Written due-diligence questions required before reconsideration

A future written commercial quotation request must ask the provider to supply, without activating an account or feed:

1. Full legal contracting entity name, registered address, jurisdiction, registration details and authorized signatory.
2. The name of every upstream market-data supplier used for NSE and BSE equities, the applicable exchange/vendor authorization, and evidence that the provider may sublicense the exact StockSamjho uses.
3. A dated instrument coverage file or written schedule for NIFTY 500, including exchange, symbol, series, ISIN where supplied, active/suspended/delisted handling and historical coverage.
4. Separate real-time, delayed and historical product definitions, with source timestamps, latency, trading-session/timezone semantics, history depth, revision/correction handling and service levels.
5. Explicit written permission for a multi-user Indian commercial web/app product covering end-user display, redistribution within the product, derived analytics, AI processing/explanations, storage/cache/retention, exports and paper/mock-trading/model-portfolio valuation.
6. The exact monthly INR or USD quote, quota, overage, taxes, billing entity, cancellation terms, user/instrument limits and any exchange/user fees.
7. Contractual warranties and remedies for upstream licensing, exchange compliance, data provenance, outages, corrections, and third-party claims. The published no-indemnity position must be clarified or accepted through a qualified legal review.

A marketing statement or a support email saying “commercial use allowed” is not sufficient. The evidence must identify the source, rights chain, product scope and permitted downstream operations.

## Safe next step

Keep this provider on the **investigate-only** list. If a written quotation is later requested, obtain the legal entity, upstream supplier and NSE/BSE rights evidence before evaluating a limited non-production technical proof. Any such proof would still require separate user approval before an account, API key, trial, subscription, request, ingestion or activation.

No provider contact, account creation, trial, API request, key, subscription, agreement, purchase or integration was initiated by this audit.

## Safety invariants

- `MARKET_DATA_ACCESS_POLICY.status` remains `NOT_CONFIGURED`; no provider adapter or ingestion is enabled.
- No NSE/BSE scraping, undocumented endpoint, unlicensed ingestion or guessed symbol/issuer mapping.
- No invented source IDs, ISINs, exchange coverage, currency, units, timestamps, entitlement or source revisions.
- No change to paper-portfolio accounting, scanner rules, candidate definitions, frozen research/holdout architecture, strategy parameters or backtest mathematics.
- No production deployment/settings/secrets/aliases change, no merge, and no live trading or broker order path.
