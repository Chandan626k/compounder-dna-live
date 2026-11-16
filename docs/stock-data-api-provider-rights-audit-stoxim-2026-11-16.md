# Stoxim — Commercial Rights, Coverage and Technical-Fit Audit

**Review date:** 16 November 2026  
**Status:** Public-document research only; not approved or configured for StockSamjho AI  
**Scope:** Stoxim Indian Company Financial Data API (stoxim.com / docs.stoxim.com)

## Executive decision

**Decision: INVESTIGATE-ONLY; NOT APPROVED for production integration.**

Stoxim is a potentially relevant Indian company-fundamentals API, but it does not currently meet the StockSamjho requirements or the published ₹2,000/month target:

- The public homepage advertises only **20+ NSE companies** and **3 years** of financial history. That is not evidence of NIFTY 500 coverage.
- The published Starter plan is **₹2,999/month before 18% GST** (₹3,538.82 including 18% GST at the published rate). Pro is ₹12,999/month before GST. The Enterprise price is custom and unknown. The Free plan is limited to 500 requests/day and one API key.
- The terms grant a limited licence for internal business purposes and integration into the subscriber's own internal applications/products. They prohibit raw-data redistribution except as part of a substantially transformed value-added product and prohibit building a competing Indian financial-data product.
- The terms prohibit AI/ML training, fine-tuning, evaluation or validation on returned data without explicit written permission. They do not clearly resolve request-time LLM inference, AI-derived explanations, customer-facing SaaS display, embeddings, or StockSamjho-specific paper-portfolio valuation.
- The provider says its data comes from XBRL filings submitted to NSE/BSE, but also says it does not independently verify the accuracy or completeness of those filings. The public material reviewed does not establish source-document IDs, filing URLs, publication/availability timestamps, historical point-in-time selection, restatement lineage, or a complete issuer/security crosswalk.
- The documented seven modules cover financials, ratios, shareholding, corporate actions, governance, announcements and company master. No quote/OHLCV market-price module is listed, so the public offering cannot be treated as a complete market-data feed for the scanner or paper portfolio.
- The API documentation link was not retrievable during this review (docs.stoxim.com returned HTTP 502 through the public page fetch). No endpoint contract or live sample was tested.

A low-cost Free plan is not a substitute for the missing NIFTY 500 coverage, source/PIT evidence, price data, or explicit multi-user and AI rights. Do not create an account, request a key, call the API, cache data, subscribe, or integrate without separate approval and written scope clarification.

## Public product and pricing

Official public homepage reviewed 16 November 2026:

- https://www.stoxim.com/
- API documentation link advertised from the homepage: https://docs.stoxim.com/ (not retrievable in this review; no schema assumptions are made).

The homepage describes an ISIN-keyed REST/JSON API and advertises these seven modules:

| Module | Public description | StockSamjho fit / unresolved checks |
|---|---|---|
| Financials | Quarterly and annual P&L, balance sheet and cash flow; 40+ line items per company | Need exact line-item schema, units, currency, consolidated/standalone basis, source document and period/revision semantics |
| Financial ratios | P/E, P/B, EV/EBITDA, ROE, ROCE, debt/equity and 15+ ratios, refreshed daily | Need formula definitions, input lineage, valuation timestamp, missing-input policy and reproducibility |
| Shareholding | Promoter, FII, DII and public percentages, filed quarterly | Need original filing link, publication date, quarter/basis and correction history |
| Corporate actions | Dividends, splits, bonuses and rights offers with ex-dates/ratios | Need source, effective-date semantics, revision history and adjustment linkage |
| Governance | Board, directors, committees and executive compensation | Need source documents, as-of date and identity validation |
| Announcements | Categorised NSE/BSE material disclosures, described as timestamped | Need source URL/document ID, exchange, publication/availability timestamp and completeness |
| Company master | Search for 20+ listed companies; returns ISIN, exchange, sector and metadata | Public headline does not establish current NIFTY 500 coverage or a durable issuer/CIN crosswalk |

The homepage also advertises daily refresh, three years of financial history, a 99.9% uptime SLA, and average response below 200 ms. These are provider-published product claims, not independently tested service levels or data-quality results.

### Published prices

The homepage states that 18% GST is applicable:

| Plan | Published monthly price before GST | Published limits |
|---|---:|---|
| Free | ₹0 | 500 requests/day; 1 API key; all seven modules |
| Starter | ₹2,999 | 10,000 requests/day; 5 API keys; all seven modules |
| Pro | ₹12,999 | 100,000 requests/day; unlimited keys; all seven modules |
| Enterprise | Custom | Unlimited requests/keys shown; price and terms not public |

At the stated 18% GST rate, Starter is ₹3,538.82/month and Pro is ₹15,338.82/month before any other charges. The homepage says annual billing offers two months free, but no signed quote or enterprise schedule was reviewed. Starter already exceeds the ₹2,000/month target before tax. The Free tier is too small to establish NIFTY 500 service capacity and its exact multi-user commercial/AI scope remains unresolved.

## Commercial licence and downstream-use assessment

Official Terms of Service: https://www.stoxim.com/terms  
The page states **Last updated: March 2025**.

The terms identify the contracting service provider as **Stoxim Technologies Pvt. Ltd.** and grant a limited, non-exclusive, non-transferable and revocable API licence for the subscriber's internal business purposes. They list programmatic API calls, webhooks, dashboard access and integration of returned financial data into the subscriber's own internal applications/products.

The same terms state that raw data may not be redistributed, resold or publicly disclosed, except as part of a substantially transformed, value-added product. They also prohibit building a competing product whose primary purpose is to provide Indian company financial data to third parties.

**StockSamjho interpretation:** the value-added-product wording may be relevant to a research product that presents its own analysis rather than a raw-data feed, but the terms do not clearly name a multi-user customer-facing investment-research SaaS, end-user display, exports, customer support views, or a StockSamjho-operated API. Obtain written confirmation for the exact product and user model before relying on this wording. Do not expose raw statements or reproduce the provider's dataset.

### AI and derived-use restrictions

Section 3 of the Terms expressly prohibits using returned data as training, fine-tuning, evaluation or validation data for machine-learning or AI models without explicit written permission.

The public terms do not clearly answer:
- Request-time LLM/RAG retrieval and model-provider processing for user explanations.
- Prompt context, embeddings, vector indexes, output retention and audit logs.
- Display of AI-generated financial summaries, ratios, scores, rankings or recommendations to paying users.
- Model evaluation/validation that is part of a live product quality process.
- Model training restrictions after termination or on derived datasets.

No AI processing or model use is authorized by this audit. Request a written, use-specific addendum if Stoxim is reconsidered.

### Caching, retention and exports

The terms prohibit systematic large-volume downloading/caching beyond plan limits when intended to replicate Stoxim's dataset. The public terms do not provide a complete StockSamjho-specific cache TTL, backup, historical snapshot, deletion, export, or post-termination retention schedule. A right to make API requests does not establish an unrestricted right to persist and republish the underlying dataset.

### Paper and simulated portfolio

No explicit permission for paper/mock trading, simulated portfolio marks, historical valuation, or public display of price-derived paper P&L was found. In addition, the homepage's seven listed modules do not include a quote/OHLCV endpoint. Stoxim should not be used as a paper-portfolio mark source on current public evidence.

## Provenance, point-in-time and identity assessment

The Terms state that the financial data is sourced from XBRL filings submitted to BSE and NSE by listed companies, that Stoxim normalises those filings, and that Stoxim does not independently verify the accuracy or completeness of the filings. The terms disclaim warranties for accuracy, completeness, timeliness and fitness for investment decisions.

Public material reviewed does not establish, for each financial observation:
- Original exchange filing URL, durable document ID, source-document version or downloadable source record.
- Actual publication/availability timestamp and timezone, distinct from the provider's daily refresh or API fetch time.
- Period start/end, fiscal-period classification, accounting basis, currency and units at field level.
- Historical point-in-time queries that exclude filings published after a decision date.
- Correction, restatement, supersession and revision lineage.
- Independent issuer/security identity validation across ISIN, exchange symbol, series and MCA CIN.
- Complete current and historical NIFTY 500 membership coverage.

The ISIN-keyed design is useful as a lookup convention, but an ISIN in an example response does not prove the provider's security master, issuer mapping, validity dates or historical identity resolution. Do not promote Stoxim values into canonical financial evidence without independent source-document, PIT, identity, period, unit, currency and entitlement checks.

The provider's data-accuracy disclaimer makes independent verification particularly important. Missing metadata must remain UNKNOWN/PIT_UNKNOWN/UNAVAILABLE; it must not be filled from a ticker, the current date, a test fixture or an inferred period.

## Counterparty and privacy diligence

The Terms name Stoxim Technologies Pvt. Ltd. but the public pages reviewed did not provide an independently verified CIN, GSTIN, registered office, authorized signatory or upstream data-rights agreement. The Privacy Policy identifies a grievance contact but displays a placeholder for the Grievance Officer's name. These are diligence items, not proof of wrongdoing.

Official Privacy Policy: https://www.stoxim.com/privacy (also states Last updated: March 2025).

The policy says API usage logs include endpoint, queried ISIN/company identifier, IP address, response code and response time, retained for 90 days. It describes account/log storage in Singapore and XBRL archives in AWS S3 in Mumbai, with some other processors in Singapore, India, the United States or global edge locations. Review data-processing terms and cross-border processing before sending StockSamjho user or portfolio context. No personal or portfolio data was sent during this audit.

The Terms publish a 99.5% uptime target for Free and 99.9% for Starter/Pro, with service credits as the stated exclusive remedy for downtime below the target. The terms also state paid subscriptions auto-renew and fees for a billing cycle are non-refundable once the cycle has commenced, except as required by law.

## StockSamjho decision matrix

| Requirement | Public evidence | Decision |
|---|---|---|
| Within ₹2,000/month | Free tier exists; Starter ₹2,999 + GST; Enterprise custom | **Not established** |
| Multi-user commercial SaaS | Internal-business/internal-product licence; transformed-value-added exception; no StockSamjho-specific scope | **Written clarification required** |
| Raw data redistribution | Prohibited except substantially transformed value-added product | **Do not redistribute raw data** |
| AI/RAG inference and derived explanations | AI training/evaluation/validation prohibited without written permission; inference/display not clearly settled | **UNKNOWN / written permission required** |
| NIFTY 500 coverage | Homepage advertises 20+ NSE companies | **Not demonstrated** |
| Financial statement coverage | Seven modules and 40+ line items advertised; source is XBRL filings | **Potentially relevant, not validated** |
| Filing provenance and PIT | No public field-level document IDs, publication times or historical as-of contract verified | **UNKNOWN** |
| Durable issuer/security identity | ISIN-keyed endpoints advertised; no independently verified crosswalk or validity history | **UNKNOWN** |
| OHLCV and live/delayed prices | No quote/candle module in the seven public modules | **Not established** |
| Paper-portfolio marks | No explicit paper/mock valuation permission or price module | **Not approved** |
| Legal counterparty diligence | Legal name in terms; registration details/signatory not independently verified | **Incomplete** |
| Approved now | No | **NO** |

## Written questions required before reconsideration

A future quotation or diligence request, only after separate user approval, should ask for:

1. Full legal contracting entity details: CIN, GSTIN, registered address, authorized signatory and invoice entity.
2. A dated issuer/security coverage file for all current NIFTY 500 constituents, with NSE/BSE symbols, series, ISINs, exclusions and active/delisted handling.
3. Original XBRL filing URLs, document IDs, publication/availability timestamps, period/basis/currency/unit metadata and restatement history for each observation.
4. Reproducible point-in-time/as-of semantics and correction/supersession handling.
5. Explicit multi-user StockSamjho web/mobile SaaS rights, including internal analysis, customer-facing transformed display, exports and derived metrics.
6. Explicit request-time AI/RAG/model-provider processing and generated explanation rights; clarify the existing AI/ML training/evaluation prohibition.
7. Cache TTL, persistent storage, backups, retention, deletion, exports and termination rights.
8. Whether paper/simulated portfolio valuation is permitted; if so, identify the specific price source, product and exchange entitlement.
9. Exact all-in price, GST, annual billing, rate limits, API-key model, SLA, overage and cancellation terms.
10. Upstream source authority and any exchange/data-owner conditions that apply to each dataset.

Do not accept a marketing statement or a generic “commercial use allowed” response in place of a product-specific written licence and source-rights evidence.

## Safe next step

Keep Stoxim on the **investigate-only** list. It is not a current recommendation for StockSamjho: the Starter plan is above budget, the advertised company coverage is far below the required NIFTY 500 universe, no public price feed is listed, and the AI/PIT/source-rights gaps remain material.

No vendor contact, quotation request, account, trial, API key, API call, data download, subscription, purchase, agreement or integration was initiated. No application tests are claimed because this is a documentation-only change.

## Safety invariants

- MARKET_DATA_ACCESS_POLICY.status remains NOT_CONFIGURED.
- No provider adapter, source registry entry, API route, ingestion, cache, database, entitlement, credential or licensed data was added.
- No NSE/BSE scraping, undocumented endpoint, unlicensed ingestion or inferred identity mapping.
- No change to the ₹5,00,000 paper portfolio, its accounting, scanner rules, frozen research/holdout architecture, candidate definitions, strategy parameters or backtest mathematics.
- No main write, merge, production deployment/promotion/rollback, production settings/secrets/aliases change, live trading or broker order path.
