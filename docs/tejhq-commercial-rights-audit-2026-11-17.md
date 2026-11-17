# TejHQ India EOD Market-Data Rights Audit

**Review date:** 17 November 2026  
**Provider terms reviewed:** TejHQ Data Terms updated 8 November 2026  
**Status:** Public-source due diligence only; not approved or configured  
**Scope:** TejHQ EOD NSE/BSE prices, adjusted prices, corporate actions, delivery data, ISIN continuity, point-in-time liquidity universe and F&O API for a commercial multi-user StockSamjho product.

## Executive decision

**Decision: NOT APPROVED for current customer-facing StockSamjho use.** TejHQ has an unusually useful EOD research dataset, including adjusted closes, ISIN-keyed symbol history and a point-in-time liquidity universe. However, its own current Data Terms explicitly state that TejHQ holds **no licence from NSE, BSE or NSE Indices and has no written clarification from them**. The terms also say exchange terms apply independently, raw data may not be published or served to others, and exchange display/redistribution terms may still apply to commercial use.

The published commercial Pro plan is ₹4,999/month and Team is ₹24,999/month, both above StockSamjho's ₹2,000/month target. The ₹599/month Retail plan is expressly personal-use only. The free parquet and free-key tiers are also personal-use only.

Keep `MARKET_DATA_ACCESS_POLICY.status = NOT_CONFIGURED`. Do not add an adapter, download or ingest the dataset for StockSamjho, create a provider account/key, make API requests, or activate a cache or subscription.

## 1. What TejHQ publishes

**Official sources:**
- [TejHQ product and pricing](https://tejhq.dev/)
- [TejHQ Data Terms](https://tejhq.dev/data-terms) — page states it was updated 8 November 2026.

The product page describes an end-of-day dataset built from NSE/BSE bhavcopy and corporate-action files. The published surfaces include:
- Daily EOD OHLCV and turnover.
- Back-adjusted close for splits, bonuses and dividends.
- Corporate-action classifications.
- ISIN-keyed symbol-history intervals intended to preserve ticker continuity across renames and mergers.
- Delivery quantity and delivery percentage.
- Derived daily metrics.
- A monthly liquidity universe described as point-in-time, with delisted names retained in the months in which they qualified.
- NSE equity F&O data through paid API plans.

The product is **EOD only**, with data described as usually ready by the next morning IST. It is not an intraday feed.

The page labels the fundamentals tree as **planned, not built, with no date**. The current product therefore does not establish a usable financial-statement/fundamentals feed for StockSamjho's canonical financial-strength analysis.

## 2. Data rights — decisive exchange-licensing blocker

**Official source:** [TejHQ Data Terms, updated 8 November 2026](https://tejhq.dev/data-terms).

The provider's own terms state:
- Its data is built from EOD bhavcopy and corporate-action files published openly by NSE and BSE.
- TejHQ holds **no data licence or agreement** from NSE, BSE, NSE Data & Analytics or NSE Indices, and has received no written clarification from them about the uses described in its terms.
- The MIT licence covers TejHQ's code and SDK, **not the market data**.
- The exchanges' own terms apply independently.
- Personal use includes private research, backtesting, paper trading, local storage and private dashboards.
- Use in a product, for clients, or inside a business is commercial use and requires Pro or Team.
- Raw data may not be published, mirrored, resold or served as data under any TejHQ plan. Publishing one's own non-reconstructive analysis is permitted under TejHQ's terms.
- If exchange data is displayed or redistributed to others, the exchanges' own display and redistribution terms may also apply; the customer is responsible for complying with them.

Consequently, a TejHQ subscription alone does **not** establish StockSamjho's right to display raw NSE/BSE prices, OHLCV, price charts or index data to its users. The provider expressly disclaims having the exchange licence needed to grant those rights. Public availability of bhavcopy files and an MIT-licensed ingestion pipeline do not establish downstream exchange-display entitlement.

## 3. Published pricing and multi-user fit

The current public pricing page states:

| Tier | Advertised price | Published use/limits |
|---|---:|---|
| Free parquet / keyless | ₹0 | Personal use |
| Free key | ₹0 | Personal use; 1,000 API calls/day |
| Retail | ₹599/month | Personal use; one key |
| Pro | ₹4,999/month | Commercial use; up to 5 keys |
| Team | ₹24,999/month | Several people; up to 10 accounts |

The provider says commercial use needs Pro or Team. The ₹2,000/month target is therefore not met by the published commercial tiers. The page does not establish a tax-inclusive payable amount; no tax total is assumed.

Even at Pro or Team, the provider's no-raw-redistribution rule and the independent NSE/BSE rights issue remain. The higher tier does not itself prove exchange display/redistribution permission.

## 4. Point-in-time and identity fit

The point-in-time monthly liquidity universe and ISIN-keyed symbol-history intervals are potentially useful for reducing survivorship and ticker-rename errors in EOD research. They are **not** equivalent to point-in-time financial-statement evidence.

The reviewed public material does not establish:
- Immutable filing/document identifiers for annual or quarterly statements.
- Original public-availability timestamps for each financial statement.
- Historical value versions or restatement/supersession lineage for fundamentals.
- A validated ISIN-to-MCA-CIN issuer crosswalk.
- Source-specific entitlement for using any such financial-statement evidence in canonical StockSamjho decisions.

The fundamentals dataset is listed as planned and not yet built. Do not infer financial-statement coverage from the EOD price, corporate-action or liquidity-universe datasets.

Preserve `UNKNOWN`, `PIT_UNKNOWN` and `UNAVAILABLE` until authoritative source documents, durable issuer/security identity, entitlement, scope, currency, units, period, revision lineage and point-in-time availability all pass independently.

## 5. Data-quality and operational limitations

TejHQ's Data Terms say the data is supplied as-is without an accuracy warranty; exchange files may contain errors and corporate-action adjustments may be wrong. The product page describes next-morning EOD availability, not intraday delivery. No service-level guarantee for the proposed StockSamjho use was established by this review.

These limitations are separate from the legal blocker: even technically useful EOD data cannot be promoted to customer-facing production use without the necessary rights and validation.

## 6. StockSamjho use-case decision

| Intended use | Current decision |
|---|---|
| Private personal research/backtesting/paper trading | Described as permitted by TejHQ's personal-use terms; not a StockSamjho business entitlement |
| Commercial internal EOD processing | TejHQ says Pro/Team is required; exchange rights still need independent confirmation |
| Customer-facing derived analytics that do not reproduce raw data | TejHQ says commercial Pro/Team use is required; exchange rights and exact permitted scope remain unverified |
| Customer-facing raw prices, OHLCV, price charts or index data | **NOT APPROVED**; TejHQ grants no exchange licence and raw data publication/serving is prohibited by its terms |
| Multi-user StockSamjho commercial deployment within ₹2,000/month | **NOT ESTABLISHED**; published commercial tiers start at ₹4,999/month |
| Canonical PIT financial-strength evidence | **NOT APPROVED**; fundamentals are planned, and filing identity/availability/revision evidence is not established |
| Paper-portfolio marks sourced from TejHQ | **NOT APPROVED** for the current commercial product; customer-facing data rights and exact valuation entitlement are unresolved |

## 7. Written evidence required before reconsideration

A future review would require, at minimum:
1. Written confirmation from NSE/BSE or a properly licensed vendor establishing the exact commercial display and redistribution rights for the intended EOD price fields, charts, OHLCV and index data.
2. The exact permitted customer-facing use, derived-analytics scope, caching, retention, backups and end-user limits.
3. Confirmation that the relevant source-rights chain covers TejHQ's cleaning, corporate-action adjustments, packaging and API delivery.
4. A StockSamjho-specific commercial quotation and tax treatment within the approved budget, if available.
5. For any proposed fundamentals integration, authoritative filing documents, immutable identifiers, publication/availability timestamps, restatement lineage, durable issuer/security identity, units, currency and source-specific entitlement.
6. Clear permission for the intended paper/mock-trading and virtual-portfolio-mark use.

No provider or exchange has been contacted, no quote requested, and no account, trial, credential, API request, subscription, purchase, agreement or integration has been initiated.

## Safety invariants

- Keep `MARKET_DATA_ACCESS_POLICY.status = NOT_CONFIGURED`; protected market-data routes remain fail-closed.
- No provider adapter, ingestion, cache, database, credentials, account, subscription, trial, agreement, purchase or provider request.
- No change to the ₹5,00,000 browser-local paper portfolio or its accounting.
- No scanner rules, candidate definitions, frozen research/holdout architecture, strategy parameters or backtest mathematics changed.
- No main write, merge, production deployment/promotion/rollback, production settings/secrets/aliases change, live trading or broker order.
- This is a public-source engineering rights audit, not legal advice. Obtain qualified legal/compliance review before any data-source onboarding.
