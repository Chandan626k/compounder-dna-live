# QUODD / Xignite India Market-Data Rights Audit

**Review date:** 16 November 2026  
**Status:** Public-source due diligence only; not approved or configured  
**Scope:** QUODD / legacy Xignite global equity quote and historical-price APIs, including NSE India coverage, for a commercial multi-user StockSamjho product.

## Executive decision

**Decision: NOT APPROVED under the reviewed standard public terms for StockSamjho customer-facing use.** QUODD/Xignite is a legitimate enterprise-market-data lead, but it is not a verified low-cost or ready-to-use route.

The NSE authorised real-time vendor roster currently linked from NSE lists **Xignite Inc** with a Capital Market (CM) coverage mark. A legacy Xignite Global Real-Time Stock Quote product page also lists NSE India among global exchange coverage. These facts justify a written enterprise enquiry, but they do not grant StockSamjho downstream rights.

The current QUODD Terms of Use (last updated 14 May 2024) grant a limited, non-exclusive, non-transferable right to use Data and Third Party Data **solely for internal business purposes**. They also state that Third Party Data may require additional agreements with the Data Owner, that the Customer is responsible for obtaining those agreements, and that Data or Third Party Data may not be displayed or made available in a Data Exchange Format to non-employee users, including the general public. That standard wording conflicts with a multi-user StockSamjho SaaS application unless QUODD and the relevant Data Owner provide a separate executed addendum/licence expressly permitting the intended customer-facing use.

Keep `MARKET_DATA_ACCESS_POLICY.status = NOT_CONFIGURED`. Do not add an adapter, make a provider request, or use any QUODD/Xignite response as canonical financial evidence.

## 1. Provider identity and NSE roster evidence

**Official sources:**
- [NSE Paid Real Time Data and Data & Info Vending](https://www.nseindia.com/static/market-data/real-time-data-subscription) — the page was marked updated 22 October 2026 when reviewed.
- [NSE Authorised Real Time Data Vendors (PDF)](https://nsearchives.nseindia.com/web/sites/default/files/inline-files/Authorized_Realtime_Data_Vendors.pdf)
- [QUODD announcement of its Xignite acquisition (16 February 2023)](https://www.quodd.com/insights/xignite-joins-quodd-solutions)
- [QUODD Terms of Use](https://www.quodd.com/terms-of-use)

The NSE-linked one-page roster lists **Xignite Inc** with a CM checkmark. The roster is a vendor-discovery and segment-coverage signal only; it does not establish the current product SKU, StockSamjho's licence, public-display entitlement, end-user reporting rights, or any right to redistribute data.

QUODD announced that it acquired Xignite in February 2023. The current QUODD Terms identify QUODD Financial Information Services and its subsidiaries/affiliates, including Xignite, Inc., as the Provider. Treat QUODD as the current contracting route unless a current quotation identifies a different legal entity and explains the relationship.

## 2. Technical coverage — promising but SKU-specific confirmation required

The legacy [Xignite Global Real-Time Stock Quote API](https://www.xignite.com/product/global-real-time-stock-quote-data/) page describes global equities and lists **NSE India** among its global exchange coverage. It advertises quotes, bid/ask, intraday data, volume and other market statistics. A separate legacy [Xignite API pricing page](https://umbraco.xignite.com/pricing) says pricing depends on the asset class and is quote-based.

QUODD's current [API and data-feed offering](https://www.quodd.com/) covers real-time and end-of-day pricing, reference data, fundamentals/estimates and multiple delivery methods. Its public pricing page says a quote depends on asset class, geography, update frequency, data type and use case; it does not publish a fixed NSE India plan or monthly amount.

**Do not assume** that the legacy Xignite page proves that a particular NSE India feed, latency, history depth, field set or commercial entitlement is currently orderable through QUODD. Obtain the current SKU, exchange/segment, delivery method, latency, history and source-specific rights in writing.

## 3. Standard terms — material SaaS restriction

**Official source:** [QUODD Terms of Use, last updated 14 May 2024](https://www.quodd.com/terms-of-use).

The reviewed standard terms state:

- The Provider grants a limited, non-exclusive, non-transferable licence to access and use Web Services solely for the Customer's internal business purposes.
- The Data licence is likewise limited to the Customer's internal business purposes.
- Third Party Data may be subject to Data Owner restrictions and may require additional agreements with the Data Owner; the Customer is responsible for obtaining required licences.
- The Customer may use Data only with software applications it owns or licenses.
- The Customer may not display or make Data or Third Party Data available in any Data Exchange Format to non-employee users, including vendors, contractors, partners and the general public.
- Caching/storage is allowed only within each Distinct Software Application and remains subject to Data Owner restrictions; the Provider reserves discretion to determine what constitutes a Distinct Software Application.

These provisions do **not** establish permission for a customer-facing, multi-user StockSamjho product. Do not infer that a general enterprise API, an NSE roster entry, or a subscription fee overrides the standard non-employee display restriction. Any exception must be in a written, executed agreement signed by authorised representatives and must identify the exact data, application, users and permitted delivery/display.

## 4. Vendor of Record (VoR) — not a demonstrated NSE India pass-through

**Official sources:**
- [Xignite: Vendor of Record service](https://umbraco.xignite.com/faqs/vendor-of-record-vor/does-xignite-offer-vendor-of-record-services/)
- [Xignite: exchanges approved for Vendor of Record](https://umbraco.xignite.com/faqs/vendor-of-record-vor/what-exchanges-is-xignite-approved-for-vendor-of-record-services/)
- [Xignite: exchange-fee explanation](https://umbraco.xignite.com/faqs/vendor-of-record-vor/what-are-exchange-fees/)

The public VoR page names **Nasdaq, NYSE, OPRA, OTC Markets (OTCM) and Toronto Stock Exchange (TSX)** for the described redistribution service. It does not list NSE or BSE. The page also describes VoR as an add-on for specified real-time/delayed API products and says the service may remove certain redistribution fees while end-user fee reporting may still apply.

Therefore, the reviewed VoR material does **not** establish an NSE India or BSE redistribution pass-through for StockSamjho. Do not treat the VoR add-on as covering Indian exchanges. QUODD must confirm the exact Indian exchange rights and whether a direct NSE/BSE agreement, display licence, subscriber reporting or end-user fees remain necessary.

## 5. Pricing and ₹2,000/month fit

**Official source:** [QUODD API pricing](https://marketdata.quodd.com/pricing).

The public pricing page is quote-based. It says price depends on asset class, geography, frequency, data type, internal/public display and redistribution. Unlimited API usage is advertised for web services, but unlimited calls do not mean unlimited licensed users or unrestricted redistribution.

No public fixed price, India-specific fee schedule, StockSamjho multi-user price, or tax-inclusive quotation was found. **There is no evidence that QUODD/Xignite fits the ₹2,000/month target.** Treat it as a potential enterprise due-diligence route only, not as the cheapest suitable source.

## 6. Point-in-time and canonical financial evidence

The reviewed quote and historical-price materials do not establish immutable filing-document identifiers, original public-availability timestamps, financial-statement revision lineage, point-in-time snapshots, or a time-valid issuer/security identity crosswalk suitable for StockSamjho's canonical financial-strength gate.

Historical prices, even where available, are not proof of PIT financial-statement evidence. Keep `PIT_UNKNOWN`, `UNKNOWN` and `UNAVAILABLE` until each required source, identity, entitlement, scope, currency, unit, period, revision and publication/availability-time condition is independently satisfied.

## 7. Written evidence required before reconsideration

A StockSamjho-specific written quotation and executed agreement would need to identify:

1. The contracting entity and its relationship to Xignite Inc.
2. The exact NSE India CM product/SKU, BSE coverage (if any), fields, intervals, latency, historical depth and delivery method.
3. The legal source-rights chain and current exchange authorisation for each data category.
4. Express multi-user SaaS, public/retail end-user display, web/mobile, derived analytics, reports, screeners, signals and attribution rights.
5. Whether paper/mock trading, virtual portfolio valuation and historical backtesting are permitted.
6. Server-side caching, storage, retention, backups, deletion and termination rights.
7. AI request-time retrieval, RAG/grounding, model evaluation/training and customer-facing model-output rights.
8. Exports, customer APIs, redistribution, sublicensing, user/site/medium limits and any subscriber reporting.
9. All vendor fees, exchange fees, end-user fees, support fees, taxes, minimum term and cancellation terms.
10. Immutable source IDs/versions, publication/availability timestamps, PIT snapshots, restatement lineage and identity metadata if the data is proposed for financial-strength analysis.

No provider has been contacted, no quotation requested, and no account, trial, credential, API request, subscription, purchase, agreement or integration has been initiated.

## StockSamjho decision

| Intended use | Current decision |
|---|---|
| Private internal evaluation under standard terms | **Potentially within internal-use wording**, subject to Data Owner restrictions and exact plan |
| Public/customer-facing raw prices or OHLCV | **NOT APPROVED** under standard terms |
| Multi-user StockSamjho SaaS display | **NOT APPROVED** without executed customer-facing rights |
| Derived analytics and signals for customers | **UNKNOWN** until a written addendum confirms scope and underlying rights |
| Paper/mock trading and virtual portfolio marks | **UNKNOWN / NOT APPROVED** pending explicit written permission and exchange rights |
| Canonical PIT financial-strength evidence | **NOT APPROVED** on current public evidence |
| ₹2,000/month budget fit | **NOT ESTABLISHED**; public pricing is custom quotation |

This is an engineering source-readiness record, not legal advice. Obtain qualified legal/compliance review of the actual source-specific agreement before onboarding any provider.

## Safety invariants

- Keep `MARKET_DATA_ACCESS_POLICY.status = NOT_CONFIGURED`; protected market-data routes remain fail-closed.
- No provider adapter, ingestion, cache, database, credentials, account, subscription, trial, agreement, purchase or provider request.
- No change to the ₹5,00,000 browser-local paper portfolio or its accounting.
- No strategy, scanner rule, candidate definition, frozen research/holdout architecture, strategy parameter or backtest mathematics change.
- No main write, merge, production deployment/promotion/rollback, production settings/secrets/aliases change, live trading or broker order.
