# Market-Data Provider Rights Audit — Indian API

**Review date:** 16 November 2026  
**Status:** Public-source due diligence only; not approved or configured  
**Scope:** Indian Stock Market API offered through Indian API, including company data, financial statements, historical/technical data and price endpoints for a commercial multi-user StockSamjho product.

## Executive decision

**Decision: NOT APPROVED for StockSamjho market-data ingestion or customer-facing use pending source-specific rights, data lineage and technical clarification.**

Indian API's general Terms of Service say its APIs may be integrated into commercial or non-commercial applications. That is a positive statement about use of the API service, but it does not identify the upstream suppliers for the Indian Stock Market API or prove that Indian API has authority to grant every right needed for the underlying exchange-derived data. The same Terms expressly carve out third-party APIs and require users to follow each third-party provider's terms.

The public product pages advertise a broad feature set, but the reviewed documentation does not establish the source-rights chain, point-in-time evidence, complete NIFTY 500 coverage, or a StockSamjho-specific multi-user licence. The public pages identify Free/Hobby, Developer, Growth Analyst and Pro plan tiers, but the exact plan prices and complete commercial terms were not verifiable in the accessible page content. Do not assume that the generic free-use clause means the full Stock Market API is free or that its underlying data is cleared for redistribution.

Keep `MARKET_DATA_ACCESS_POLICY.status = NOT_CONFIGURED`. Do not add an adapter, issue provider requests, or promote any response to canonical financial evidence.

## 1. What the public product advertises

The Indian Stock Market API product page describes data for NSE- and BSE-listed companies, including company profiles, stock prices, technical data, financials, key metrics, analyst views, shareholding, corporate actions and recent news.

Its public API reference lists endpoints including:

- `/stock`, `/statement`, `/historical_data` and `/historical_stats`
- `/stock_forecasts` and `/stock_target_price`
- `/recent_announcements`, `/corporate_actions` and market-overview endpoints
- mutual-fund, IPO and commodity endpoints

The analyst documentation describes delayed live-price endpoints, batch NSE/BSE price calls and one-day intraday data at five-minute intervals. It says prices are in INR unless otherwise noted, timestamps are in IST, and market data may be stale when exchanges are closed.

There is a material wording difference to resolve: the main product overview describes stock prices as real-time, while the analyst API documentation describes delayed live prices and warns that data may be stale when exchanges are closed. No precise latency or delay guarantee was established in the reviewed material.

The documentation also advertises an `all_stocks.json` list with NSE/BSE codes and an internal stock ID. A list of codes is not proof of complete NIFTY 500 coverage, a durable issuer/security master, or a time-valid exchange identity crosswalk. A company-profile field described as ISIN is not, by itself, proof of allocation, authoritative mapping or temporal validity.

## 2. Terms and downstream rights

The Indian API Terms of Service page states:

- The Terms were last updated 22 June 2026.
- Its Free Usage clause says the APIs may be used for commercial or non-commercial purposes and integrated into applications, websites or services.
- The APIs are supplied without warranties of accuracy, completeness, availability or performance.
- Indian API may modify, suspend or discontinue an API without notice.
- Users remain responsible for legal compliance.
- Its Third-Party APIs clause says the marketplace may include APIs from third-party providers and that users must review and comply with each external provider's terms.

The general commercial-use wording does not settle whether Indian API is the upstream data-rights holder for each stock-data field, whether it has exchange or other source permissions, or whether those permissions permit StockSamjho's intended use. The third-party clause makes source-specific terms especially important.

The reviewed public terms do not expressly resolve:

- the upstream source and rights chain for NSE/BSE prices, OHLCV, financial statements, analyst data, announcements and corporate actions;
- customer-facing display of raw prices, OHLCV, price charts or index values;
- server-side caching, persistent storage, historical backfills, retention and backups;
- derived screeners, rankings, signals, financial ratios and customer reports;
- AI inference, RAG/grounding, evaluation, training or model distribution;
- commercial paper/mock trading, portfolio marks and historical backtesting;
- redistribution through exports or a customer-facing API;
- multi-user SaaS, user/site/medium limits, sublicensing or competing-product restrictions.

Do not infer that a generic API integration permission overrides exchange, upstream supplier or third-party restrictions.

## 3. Price, service levels and technical evidence

The product Q&A names Free/Hobby, Developer, Growth Analyst and Pro tiers and identifies different hostnames for the tiers. It directs users to a dynamic Pricing tab, but exact plan prices, quotas, taxes, renewal terms and commercial user limits were not verifiable from the accessible public page content during this review. The general Terms' free-use wording is not a written quote for the full Stock Market API.

The product Q&A says the service aims for 99% uptime; it does not establish a contractual SLA. The Terms disclaim warranties and permit service changes or discontinuation without notice.

The reviewed API documentation does not establish:

- original filing/document identifiers and immutable source-document versions;
- original publication and public-availability timestamps;
- point-in-time snapshots, correction history or restatement lineage;
- authoritative issuer/security IDs and time-valid ISIN/CIN/provider-symbol mappings;
- field-level source, accounting basis, statement scope, metric scope, units and period metadata;
- independently verified NIFTY 500 universe coverage and historical membership;
- a documented data-correction process or contractual availability SLA.

The documentation's IST timestamps and stale-when-closed note are not substitutes for publication time, availability time, retrieval time and a reproducible point-in-time snapshot. Do not use these responses as canonical financial-strength evidence until every evidence, identity, entitlement, period, currency, unit and PIT gate is independently satisfied.

## 4. Written evidence required before reconsideration

Request a written, StockSamjho-specific response and commercial quotation that identifies:

1. The contracting legal entity, exact API product/version, plan, quotas, price, GST, renewal and minimum term.
2. Every upstream source and the legal basis on which Indian API can grant downstream rights for each data category.
3. Whether the stock-data API is first-party or a third-party API under the Terms, and the applicable provider-specific terms.
4. NSE/BSE exchange, segment, instrument universe, NIFTY 500 coverage, historical depth, latency, delayed/live status and field-level provenance.
5. Explicit rights for multi-user commercial SaaS, web/mobile display, raw-price and OHLCV display, charts and index values.
6. Derived analytics, screeners, rankings, signals, customer reports, AI inference, RAG, model evaluation/training and model distribution rights.
7. Paper/mock trading, portfolio valuation, historical backtesting and any exchange restrictions that apply.
8. Server-side caching, persistent storage, backups, retention, correction, deletion and termination rights.
9. Exports, customer APIs, redistribution, sublicensing, attribution and competing-product restrictions.
10. Immutable source-document IDs/versions, publication/availability timestamps, PIT/restatement history, durable issuer/security identity, accounting basis, statement/metric scope, currency, units and period metadata.

No provider has been contacted, no written quotation requested, and no account, API key, trial, subscription, agreement, purchase or provider request has been initiated.

## 5. Safety invariants

- Keep `MARKET_DATA_ACCESS_POLICY.status = NOT_CONFIGURED`; protected market-data routes remain fail-closed.
- Do not add provider credentials, secrets, accounts, adapters, ingestion, database tables, caches or scheduled provider requests.
- Do not use this source for canonical PIT financial-strength evidence or paper-portfolio marks without independently verified rights and data lineage.
- Keep the ₹5,00,000 browser-local paper portfolio and its accounting unchanged.
- Do not change scanner parameters, candidate definitions, frozen research/holdout architecture, strategy parameters or backtest mathematics.
- No live trading, broker integration, signal-to-order path, main-branch write, merge or production action.
- Preview SSO remains enabled; no browser click-through, console or network validation is claimed.

This is an engineering source-readiness record, not legal advice. Obtain qualified legal/compliance review of the actual source-specific agreement before onboarding any provider.

## Public sources reviewed

- Indian API Terms of Service (last updated 22 June 2026): https://indianapi.in/legal/terms
- Indian Stock Market API product page and plan documentation: https://indianapi.in/indian-stock-market
- Indian Stock Market API documentation: https://indianapi.in/documentation/indian-stock-market
- Analyst API documentation (delayed prices, endpoint scope and IST/staleness notes): https://analyst.indianapi.in/
- Indian API contact page (not contacted): https://indianapi.in/contact
