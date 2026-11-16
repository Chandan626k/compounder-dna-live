# Marked and Research & Invest — Commercial Data Rights Audit

**Review date:** 2026-11-16  
**Status:** Public-source due diligence only; no vendor contact, account, trial, API key, subscription, purchase, agreement, entitlement or data activation  
**Product context:** StockSamjho is intended to be a multi-user Indian equity research application with internal analysis, customer-facing research views, derived analytics, AI-assisted explanations and a browser-local paper portfolio. This review separates technical API capability from legal permission to use, store, display or redistribute data.

## Executive decision

- **Marked:** Strongest technical fit found so far for normalized Indian-company financials, filing provenance, canonical issuer/security identity, point-in-time financial observations and historical OHLCV. It is **not approved for StockSamjho commercial use on Developer, Builder or Scale subscriptions**. Its published Terms expressly say those plans do not grant commercial-use, commercial-deployment, customer-facing, resale or redistribution rights. Those uses require a separate Enterprise agreement signed by Marked. Marked is therefore the **first-priority Enterprise RFQ candidate only**, not an approved source and not a cheap commercial API.
- **Research & Invest:** A **conditional business-API RFQ candidate** for derived screeners, fundamental/technical scores and F&O analytics. Its business page says APIs are available on request and raw exchange feeds are subject to exchange licensing. Its public membership terms are for an individual's own research and prohibit copying, scraping, resale or redistribution without written permission. A retail membership is not a StockSamjho API licence. Exact business API price, upstream rights, field-level provenance, PIT/restatement history and paper-portfolio use remain unverified.
- **No cheapest legally suitable multi-user commercial source under ₹2,000/month has been established.** Marked's published low-cost plans are expressly internal-use only; Research & Invest quotes business APIs separately and does not publish a commercial API price or rights schedule.

Keep MARKET_DATA_ACCESS_POLICY.status = NOT_CONFIGURED. Do not add either provider to the runtime registry, provider adapter, ingestion pipeline, persistent cache, entitlement store or market-data access policy until source-specific written rights and technical validation pass.

## 1. Marked

### Publicly documented technical capability

Marked presents a REST API and MCP server for Indian public-market data. Its documentation describes these datasets and interfaces:

| Dataset / interface | Publicly documented capability | StockSamjho validation still required |
|---|---|---|
| Companies | Canonical company master; docs advertise 9,400+ listed companies from NSE, BSE and issuer records | Exact active Nifty 500 membership, duplicate/issuer mapping, historical membership and 500-versus-501 reconciliation |
| Instruments | Exchange-traded securities linked to companies; filters include ticker, exchange, segment, ISIN and company | Verify every symbol/series/ISIN against the current official exchange security master and resolve multiple securities per issuer |
| Financials | Income statement, balance sheet and cash-flow facts; quarterly/annual, consolidated/standalone and an as_of cutoff | Validate each fact against the original filing, period start/end, units, currency, publication time, revision and restatement lineage |
| Financial metrics | Derived profitability, leverage, liquidity and growth measures; missing inputs are omitted rather than estimated | Recompute critical metrics from source facts and confirm formulas, accounting definitions and peer comparability |
| Filings | Filing/document search with reporting and publication metadata; docs advertise 25K+ filings/disclosures from exchanges and issuer investor-relations sources | Confirm source URL, document identity, actual publication/availability time, complete Q2 FY27 coverage and document-text quality issuer by issuer |
| Shareholding | Period-end ownership snapshots and holder-level detail where available | Confirm source document, exact quarter, holder completeness, pledge coverage and correction history |
| Prices | Exchange-labelled latest quote or historical OHLCV; docs list 1m, 5m, 15m, 30m, 1h and 1d intervals | Confirm EOD timestamp, feed provider, entitlement, historical depth, adjustment policy, corporate-action treatment and paper-mark permission |
| Corporate actions / events | Dividends, splits, bonuses, rights, buybacks and normalized company events | Validate completeness, effective dates, revisions and price-adjustment linkage |

The financials documentation says observations preserve reporting period, basis and source context and supports an as_of cutoff. The point-in-time guide says observations are appended rather than overwriting history and that the canonical read selects one eligible observation per concept, period and basis using source-quality rules. The provenance tool is described as returning the full observation history. This is materially closer to StockSamjho's PIT requirements than a simple current-ratio API.

Important limitations are explicit in Marked's own documentation:

- Coverage and freshness vary by dataset, issuer and source format.
- Some filings lack enough period metadata to classify a fact as annual or quarterly. Those observations appear under period=any and must not be forced into annual/quarterly analysis.
- The filings endpoint says source availability and document-text quality vary by issuer and filing format.
- The latest quote is the latest observation Marked holds, not a guarantee of an executable real-time price. The response timestamp must be checked.
- A dataset that has not been collected is documented to return HTTP 503 rather than a misleading empty result.

### Coverage-count discrepancy

The public homepage currently displays **7,800+ listed companies** in its hero section and **9,400+ Indian listed companies** farther down the same page. The documentation introduction and Companies endpoint advertise 9,400+. This is a public-page scope/count inconsistency, not proof that either figure is wrong.

Before relying on a coverage claim, require Marked to state in writing:
1. The exact legal meaning of the count (companies, issuers, securities, historical listings or a mixture).
2. The active versus delisted/historical split.
3. Whether duplicate NSE/BSE listings are counted once or multiple times.
4. The current Nifty 500 constituent coverage by issuer and security.
5. The exact data-as-of date and excluded/unavailable issuers for each dataset.

Do not infer Nifty 500 completeness from a 9,400+ company headline.

### Published price and licence distinction

The public homepage displays these standard subscriptions in USD:

- Developer: USD 5/month.
- Builder: USD 25/month.
- Scale: USD 249/month.

These are published standard-plan prices, not commercial StockSamjho prices. The Terms of Service, effective and last updated **12 September 2026**, explicitly state that Developer, Builder and Scale do not grant commercial-use, commercial-deployment, resale, redistribution or customer-facing rights to Marked data, outputs or services. Those rights require a separate Enterprise agreement signed by Marked. The Enterprise agreement controls permitted products, users, territories, sources and redistribution.

The same Terms state that source datasets and filings may carry their own rights, notices and redistribution restrictions and that the customer is responsible for complying with them and preserving attribution. Therefore, even a signed Marked Enterprise agreement must identify the upstream source rights and exact downstream scope for each dataset.

The Terms describe the operator as being based in India and operating under the Marked name, but the public Terms page reviewed does not identify the contracting legal entity. Before any commercial agreement, obtain the full legal entity name, CIN/registration details, GSTIN, registered address, authorized signatory and evidence that it can grant the proposed source rights.

### AI, storage and derived-use questions

The documentation is designed for agents and provides REST/MCP access, but that technical design is not a commercial AI/RAG licence. The public Terms also say third-party clients, models, hosting providers and integrations remain subject to their own terms. The Enterprise agreement must explicitly cover:

- Request-time LLM/RAG retrieval and model-provider processing.
- Generated explanations and derived ratios, scores, rankings and research summaries.
- Embeddings, vector indexes, prompt/output retention, audit logs and model-training restrictions.
- Persistent cache, historical snapshots, backups, exports, deletion and post-termination retention.
- Named StockSamjho website/mobile app, number of users, concurrent users and geographic territories.
- Internal/non-display use versus customer-facing display.
- Paper/virtual portfolio valuation and historical simulation, if any.
- Each upstream source, exchange, dataset and permitted downstream use.

Do not assume the agent-oriented documentation overrides the standard-plan restriction or third-party source rights.

### StockSamjho decision

**Priority Enterprise RFQ candidate only. Not approved to integrate.**

A technical proof of coverage would require a lawfully authorized sample or trial supplied by Marked under terms that permit the test. No account, key or trial was created in this review. Before any such test, obtain written permission for the exact evaluation scope and data handling.

## 2. Research & Invest

### Publicly documented business/API offering

The official Services page says Research & Invest is operated by MG Infratech and offers business analytics and APIs on request. The page describes:

- JSON APIs for derived research.
- Screener results and technical/fundamental scores.
- F&O analytics including put-call ratio, max pain and open-interest build-up.
- Directories of SEBI-registered Research Analysts and Investment Advisers.
- Custom dashboards, screens, scans and backtests.
- Raw market-data feeds on request, subject to exchange licensing.

Its public About page, last updated **29 October 2026**, says the platform's data comes from NSE and BSE public files and broker market-data feeds, checked daily. Its Terms, last updated **29 October 2026**, say market data may be delayed, incomplete or contain errors and is for information only, not an official record.

### Public terms and retail membership boundary

The Terms state that an account is for one person and must not be shared or resold. Users may use the platform for their own research; copying, scraping, reselling or redistributing its data, analytics or content requires written permission. The retail membership page describes a one-day trial and a monthly membership including GST, but this is not the business API quotation.

The Services page says business APIs and custom tools are scoped and quoted after the provider understands the intended use. It does not publish an API price or a StockSamjho-specific commercial licence. Raw exchange feeds are expressly subject to exchange licensing.

The platform's public Terms and About page state that MG Infratech is not registered as a SEBI Research Analyst, Investment Adviser or stock broker and does not give investment advice or place orders. StockSamjho must treat it as a technology/data-services provider, not as a substitute for an independently qualified investment professional or legal/compliance review.

### Provenance, PIT and data-rights gaps

The public pages identify NSE/BSE public files and broker feeds as source categories, but do not document, field by field:

- Original filing/document URL and durable source-record ID.
- Exact upstream data provider and applicable exchange/product licence.
- Publication/availability timestamp and historical point-in-time version.
- Reporting period start/end, consolidated/standalone basis, currency and units.
- Restatement/correction history and revision lineage.
- Security-master mapping across issuer, NSE/BSE symbol, series, ISIN and corporate actions.
- Historical OHLCV depth, adjustment policy, EOD cut-off and price-feed timestamp.
- Permission for multi-user display, persistent cache, AI/RAG, derived analytics, exports and paper/virtual portfolio marks.

The business API may be useful for derived scores and research outputs, but those outputs cannot pass StockSamjho's evidence gate until the inputs, definitions, dates, provenance and licensing are documented. A raw feed being available on request subject to exchange licensing is not proof that a StockSamjho licence exists.

### StockSamjho decision

**Conditional business API RFQ candidate. Not approved to integrate.**

Request a written, product-specific proposal separating:
1. Derived research APIs (screeners, fundamental/technical scores, F&O analytics).
2. Raw NSE/BSE EOD, delayed and real-time market data, each separately.
3. Company financials, results, shareholding, corporate actions and source filings.
4. Historical data, backtests and any permitted paper/virtual portfolio use.

For each product, require the upstream source, exchange/product authorization, permitted users, named websites/apps, storage/cache, AI/RAG, derived analytics, redistribution, price, SLA and source-level provenance. Do not use a retail membership account as a backend credential or share it among StockSamjho users.

## 3. Comparative decision matrix

| Requirement | Marked | Research & Invest |
|---|---|---|
| Documented REST/API interface | Yes; REST and MCP | Business JSON APIs on request |
| Company/security identity | Canonical company and instrument model; exchange, ISIN and CIN references documented | Public business page does not specify a canonical identity contract |
| Financial statements | Income, balance sheet, cash flow; quarterly/annual and standalone/consolidated | Business page advertises derived fundamental scores; raw statement schema not public |
| Point-in-time/restatement history | Explicit as_of and appended-observation model documented | Not established publicly |
| Filing/source-document access | Filing endpoint and provenance workflow documented | Source categories described; field-level filing contract not public |
| OHLCV | Historical candles and latest observations documented | Raw feeds available on request subject to exchange licensing |
| Public coverage claim | 7,800+ and 9,400+ both appear on homepage; docs say 9,400+ | Website has a NIFTY 500 stocks page; complete current 500-member API coverage not established |
| Public commercial API price | Standard plan prices published, but commercial rights excluded; Enterprise custom | No public business API price; quoted on request |
| Commercial multi-user rights | Enterprise agreement required | Written permission and source-specific commercial terms required |
| AI/RAG and derived explanations | Must be expressly included in Enterprise agreement | Not established by public terms; written permission required |
| Persistent cache and historical storage | Must be expressly included; source rights may also restrict | Not established; written permission required |
| Paper/virtual portfolio marks | Not established; require explicit approval and source licence | Not established; raw feeds remain subject to exchange licensing |
| Approved now | **No** | **No** |

## 4. Six-perspective simulated investment committee

This is a simulated committee assessment, not a meeting with real human professionals.

1. **Long-term product/compounder perspective:** Marked's normalized financials, identity, source context and PIT design are the strongest technical fit. Research & Invest may add useful ready-made scores and screens.
2. **Fundamental/forensic perspective:** Marked's public PIT and provenance design is promising, but every material field still needs source-document reconciliation. Research & Invest's public documentation is less granular.
3. **Valuation perspective:** The USD 5/25/249 Marked plans are irrelevant to a commercial product because their terms exclude commercial deployment. Enterprise pricing is unknown. Research & Invest business API pricing is also unknown.
4. **Technical/data perspective:** Marked has the clearer documented schema for company, instrument, financial, filing and OHLCV datasets. Research & Invest has an advertised JSON API for derived research but not a public field-level contract.
5. **Risk manager:** Neither provider has supplied a signed StockSamjho-specific entitlement or demonstrated all-500 coverage. Keep the market-data access policy closed.
6. **Independent red team:** Marked's conflicting company counts and undisclosed contracting legal entity need resolution. Research & Invest's broker-feed mix, delayed/incomplete-data disclaimer and own-research restriction create material downstream and PIT gaps.

**Resolution:** Marked ranks first for a possible Enterprise RFQ; Research & Invest ranks second for a scoped business-API RFQ. Neither passes the commercial/legal gate. Do not connect either provider or lower the provenance standard.

## 5. Mandatory RFQ and validation checklist

Before any provider can be approved, require written responses and evidence for all of the following:

1. Exact current Nifty 500 constituent coverage, with issuer and security rows, exchange symbols, series, ISINs, source date and exclusions. Reconcile the official constituent-file 500-versus-501 discrepancy rather than assuming a headline count is complete.
2. Q2 FY27 results and filing coverage for all 500 constituents, including banks, NBFCs, insurers and other sector-specific statement formats.
3. Original source URL, document ID, publication/availability timestamp, reporting period, basis, currency, units and source revision for every financial observation.
4. Historical restatements/corrections and reproducible as_of queries that do not leak later filings into earlier decision dates.
5. Official security-master mapping and corporate-action history; no ticker-only issuer inference.
6. EOD/delayed/real-time OHLCV source, exchange entitlement, exact timestamp, history depth, adjustment policy, corporate-action handling and missing-bar semantics.
7. Written multi-user commercial rights for the StockSamjho website and mobile app, internal/non-display analysis, derived metrics, customer display, exports and redistribution.
8. Explicit AI/RAG/request-time inference, model-provider processing, embeddings, prompt/output retention, model-training restrictions and audit-log rights.
9. Explicit persistent storage, cache TTL, backup, historical snapshots, deletion, retention and termination rights.
10. Explicit paper/virtual portfolio valuation and historical simulation rights, separately from real-time public display.
11. Legal contracting entity, CIN/registration details, GSTIN, registered address, authorized signatory, upstream source agreements and indemnities.
12. Exact monthly/annual all-in pricing, setup charges, per-segment/platform/user fees, GST, minimum term, SLA, support, rate limits and overage pricing.

A provider that cannot answer a required item must remain UNKNOWN/UNVERIFIED; missing data is not a negative result, and a low price is not a licence.

## 6. Sources and publication-date record

### Marked
- Homepage and published plans: https://marked.run/ — reviewed 2026-11-16; the page displays both 7,800+ and 9,400+ coverage figures and USD plan prices.
- Terms of Service: https://marked.run/terms — effective and last updated 2026-09-12.
- Documentation introduction: https://docs.marked.run/ — reviewed 2026-11-16; no separate page publication date displayed.
- Data provenance: https://docs.marked.run/provenance/ — reviewed 2026-11-16; no separate page publication date displayed.
- Companies: https://docs.marked.run/api/companies/ — reviewed 2026-11-16.
- Instruments: https://docs.marked.run/api/instruments/ — reviewed 2026-11-16.
- Financial statements: https://docs.marked.run/api/financials/ — reviewed 2026-11-16.
- Periods and point-in-time: https://docs.marked.run/guides/point-in-time/ — reviewed 2026-11-16.
- Company identifiers: https://docs.marked.run/guides/company-identifiers/ — reviewed 2026-11-16.
- Filings: https://docs.marked.run/api/filings/ — reviewed 2026-11-16.
- Prices: https://docs.marked.run/api/prices/ — reviewed 2026-11-16.

### Research & Invest
- Services and business APIs: https://researchandinvest.com/services — reviewed 2026-11-16; no separate page publication date displayed.
- Terms and Conditions: https://researchandinvest.com/terms — last updated 2026-10-29.
- About: https://researchandinvest.com/about — last updated 2026-10-29.
- Pricing: https://researchandinvest.com/pricing — reviewed 2026-11-16; retail membership page, not a business API quotation.

No vendor was contacted, no quotation was requested, and no account, free trial, credential, subscription, purchase, agreement, API call or data activation was initiated.

## Safety and implementation boundary

- Keep MARKET_DATA_ACCESS_POLICY.status = NOT_CONFIGURED.
- No provider adapter, source registry entry, API route, ingestion, cache, database, entitlement, credential or licensed data was added.
- No change to the ₹5,00,000 browser-local paper portfolio, its accounting, scanner rules, frozen research/holdout architecture, candidate definitions, strategy parameters or backtest mathematics.
- No broker integration, real order, production action, main write, merge, production deployment/promotion/rollback or production settings/secrets/aliases change.
- Documentation-only research; no application test run is claimed.
