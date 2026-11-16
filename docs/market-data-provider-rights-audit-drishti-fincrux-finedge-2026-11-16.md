# Market-Data Provider Rights Audit — Drishti, Fincrux and FinEdge API

**Review date:** 16 November 2026  
**Status:** Public-source due diligence only; no provider approved or configured  
**Scope:** Indian listed-company financial data, filings/events, historical prices, commercial multi-user use, personal research, AI-derived analysis and the existing paper portfolio

## Executive decision

None of the three providers is currently approved as a StockSamjho market-data source.

| Provider | Published entry price | Publicly evidenced fit | Decision |
|---|---:|---|---|
| Drishti | Starter ₹2,000/month; Sandbox free | Indian company events, filings, news, concalls, alerts, block deals and limited price/volume context; not a full OHLC price feed | **NOT APPROVED for StockSamjho product use under the reviewed terms** |
| Fincrux | Hobby free; Plus ₹200/month; Pro ₹1,000/month | Advertises 3,000+ NSE/BSE companies, statements, shareholding, historical prices, filings and FII/DII | **UNKNOWN / NOT APPROVED until source rights and a commercial API licence are documented** |
| FinEdge API | Individual ₹2,000/month; Professional ₹5,000/month; Enterprise from ₹50,000/month | Advertises 5,000+ listed companies, statements, ratios, shareholding, corporate actions and price data | **UNKNOWN / NOT APPROVED; material rights and source evidence are not publicly established in the reviewed pages** |

A low API price is not proof of an exchange licence, a right to serve data to StockSamjho users, or permission for AI, caching, paper trading or derived analytics. Do not add an adapter or change `MARKET_DATA_ACCESS_POLICY.status = NOT_CONFIGURED` on the basis of these public pages.

## 1. Drishti — Manasija Technologies Pvt Ltd

### Published capability and price

Official documentation reviewed 16 November 2026:

- [Pricing and credits](https://drishti.manasija.in/docs/pricing)
- [API documentation](https://drishti.manasija.in/docs)
- [Terms and Conditions](https://drishti.manasija.in/legal/terms-and-conditions)
- [Drishti's provider/source description](https://drishti.manasija.in/blog/nse-bse-company-announcements-python-without-scraping)
- [Drishti's Node.js data-scope guide](https://drishti.manasija.in/blog/nse-bse-api-nodejs-typescript-2026)

The terms identify the provider as **Manasija Technologies Pvt Ltd**, Mangalore, Karnataka, and show an effective date of 5 June 2026.

Published plans:

- Sandbox: free, 1,000 one-time credits, 10 requests/minute, 1,000 requests/day plan-wide, REST only and no WebSocket live streams.
- Starter: ₹2,000/month, 10,000 credits per billing cycle, 60 requests/minute, 60,000 requests/day plan-wide and WebSocket products for up to 100 active symbols account-wide.
- Pro: ₹10,000/month, 50,000 credits per billing cycle, 180 requests/minute, 180,000 requests/day and up to 1,000 active symbols account-wide.
- Enterprise: custom commercial terms and full-market WebSocket access by agreement.

The documented product set includes announcements, earnings, conference calls, news, block deals, alerts, company/symbol metadata, and historical closing-price/volume context. The provider's own Node.js guide says a separate price-feed vendor is needed for OHLC data. Full-market screening/streaming is positioned as an Enterprise scope, not the ₹2,000 Starter plan.

### Rights blocker

The public Terms define a **Competing Product** broadly to include stock research, equity research, financial-data, market-data, fintech, market-intelligence, analytics, scoring and AI/ML model-development products. The definition also covers a product that competes with, substitutes for or replicates Drishti's services by providing substantially similar data, insights or feeds; that second limb expressly applies regardless of licence.

Sections 7 and 8 prohibit creating, training or operating a Competing Product and state that Drishti Content or AI Output must never be used to build one. StockSamjho is itself a stock-research/financial-analysis product, so this wording is a material conflict. A generic Starter/Pro subscription or ordinary Permitted Display right does not resolve the express competing-product restriction. Any consideration would require a signed, explicit StockSamjho carve-out or amended agreement that overrides the restriction; a sales assurance or generic display permission is insufficient.

Other material limitations:

- “Internal Use” excludes use that develops, powers or is embedded in a product/service made available to End Users.
- End-user display is permitted only to the extent enabled by the plan or Order Form. Programmatic re-exposure is not automatically included.
- Third-party materials may carry supplier restrictions. The public Terms do not, by themselves, identify the full upstream data suppliers or establish the precise exchange/source rights for every dataset.
- Section 21 incorporates additional Acceptable Use, Data License, API/MCP/WebSocket, Data Retention & AI Training and Subscription/Billing terms, plus any order form/addendum. Those additional documents and a StockSamjho-specific Order Form were not publicly verified in this review.
- The documented price/volume context is not a substitute for a complete OHLCV price feed or an independently verified canonical financial-statement/PIT source.

**Decision:** NOT APPROVED for StockSamjho product integration under the reviewed public Terms. Drishti may be relevant to a separate private analyst workflow only after the applicable platform agreement and supplier restrictions are reviewed, but that would not authorize embedding it in StockSamjho. Do not create an account, use a trial, contact sales, purchase or integrate as part of this audit.

## 2. Fincrux

### Published capability and price

Official public pages reviewed 16 November 2026:

- [Pricing](https://fincrux.org/pricing)
- [Terms and Conditions](https://fincrux.org/terms)
- [API overview](https://fincrux.org/docs/overview)
- [Company Financials API](https://fincrux.org/docs/company-financials)
- [Company Filings API](https://fincrux.org/docs/company-filings)
- [Company Historicals API](https://fincrux.org/docs/company-historicals)

The pricing page advertises 3,000+ NSE/BSE listed companies and the same endpoints across plans:

- Hobby: free, 5 API calls/day.
- Plus: ₹200/month, 10 calls/minute and 5 forced financial refreshes/day.
- Pro: ₹1,000/month, 60 calls/minute and 25 forced financial refreshes/day.

Rate limits and refresh allowances are account-wide, not per API key. The public plan description does not establish a NIFTY 500 constituent guarantee or a complete source-authority statement.

### Technical evidence and limitations

The financial endpoint documents quarterly results, P&L, balance sheet, cash flow, ratios, shareholding and a `last_updated_at` field. Its example timestamp has no explicit timezone offset. A provider refresh timestamp is not itself a filing-publication timestamp or proof of point-in-time availability.

The filings endpoint documents original filing links, publication timestamps and an `is_revised` flag. The documentation says only the latest five announcements are exposed; older announcement history is not included. The revision flag is derived from title keywords such as “Revised”, “Restated”, “Re-stated” or “Recast”. A false value means no such marker was found in the title; it does not certify that the result is final or unrevised.

The historical endpoint documents OHLCV and time fields, but the public response example does not establish a complete source-specific currency, adjustment, entitlement, revision or PIT contract. The public API examples are not independent production validation.

### Rights and provenance blocker

The public Terms page says it was last updated **18 February 2025**. It contains generic account, intellectual-property, third-party-link and disclaimer provisions, but the reviewed page does not expressly grant or define:

- commercial multi-user/customer-facing display;
- derived analytics, scoring, screening or public reports;
- AI inference, LLM grounding, RAG, model evaluation or training;
- paper/mock-trading or portfolio-valuation use;
- server-side caching, retention, backups or deletion after termination;
- redistribution, exports or downstream API access;
- the underlying NSE/BSE/company-filing data sources, upstream licences or the provider's authority to grant those rights.

The Terms use a generic “Company” reference; the reviewed page does not clearly identify the contracting legal entity. Public API docs identify fields and endpoints but do not replace a source-rights schedule or signed commercial licence.

**Decision:** UNKNOWN / NOT APPROVED. Fincrux is the lowest published price found in this review, but the ₹200–₹1,000 subscription prices establish API access and quotas only. They do not establish StockSamjho's commercial or personal data rights. Do not treat the Hobby/Plus/Pro plans as licensed production data. Before any future consideration, obtain the legal contracting entity, source-by-source rights chain, a current written API/data licence, exact NIFTY 500 coverage, statement source documents, publication/availability timestamps, currency/units, restatement lineage, cache/retention rules, AI/derived-use rights, paper-valuation permission and end-user display/redistribution terms.

## 3. FinEdge API — do not confuse with the FinEdge Excel add-in

### Published capability and price

The reviewed product is [FinEdge API](https://www.finedgeapi.com/), not the separately named FinEdge Excel add-in.

Its public homepage advertises 5,000+ listed companies, 500+ ratios, financial statements, shareholding, corporate actions, daily quotes and commodity data. It lists:

- Basic: free, but the homepage limits the free trial to ITC, Reliance and HDFC Bank.
- Individual: ₹2,000/month, quarterly billing.
- Professional: ₹5,000/month, annual billing; described as a single-user licence for business or professional purposes.
- Enterprise: starts at ₹50,000/month.

These are vendor-published prices and capability claims, not verified data entitlements.

### Evidence gaps

The reviewed homepage and public search results did not establish an accessible source-specific API licence or complete terms for:

- the legal contracting entity and upstream data suppliers;
- NSE/BSE source authority and permitted exchange/segment scope;
- NIFTY 500 coverage and historical depth;
- original filing IDs/URLs, publication and availability timestamps, PIT/restatement lineage;
- currency, units, standalone/consolidated statement selection and revision semantics;
- multi-user display, derived analytics, AI/LLM use, paper trading, caching, retention or redistribution.

The Individual tier is not evidence of permission to serve data through StockSamjho. The Professional plan is explicitly single-user and already exceeds the current ₹2,000/month target; Enterprise is far above it.

**Decision:** UNKNOWN / NOT APPROVED. Do not create an account, start a trial, pay for the Individual/Professional plan, or build an adapter until a complete legal and source-specific package is supplied and reviewed.

## Comparative decision for StockSamjho

| Requirement | Drishti | Fincrux | FinEdge API |
|---|---|---|---|
| Published entry price | ₹2,000/month Starter | Free; ₹200 Plus; ₹1,000 Pro | ₹2,000 Individual; ₹5,000 Professional; Enterprise from ₹50,000 |
| NIFTY 500 guarantee verified | No | No | No |
| Full OHLCV feed | No; provider guide says use a separate price-feed vendor | Historical OHLC documented; source/rights not established | Advertised; schema and source rights not established |
| Original filing links | Yes for documented filings | Yes for latest five announcements | Not verified |
| PIT/restatement contract | Not verified for StockSamjho canonical financial evidence | Limited title-derived revision flag; not sufficient | Not verified |
| Multi-user/customer display | Plan/order-form permission, but Competing Product restriction conflicts | Not granted clearly in reviewed Terms | Not established |
| AI/derived use | Restricted by Competing Product clause; extra documents apply | Not established | Not established |
| Paper/mock trading and valuation | Not established; competing-product clause is a blocker | Not established | Not established |
| Current decision | **NOT APPROVED** | **UNKNOWN / NOT APPROVED** | **UNKNOWN / NOT APPROVED** |

None currently qualifies as the cheapest legally suitable source for the commercial multi-user StockSamjho product. Fincrux is the cheapest published API plan, not a verified licence. Drishti's ₹2,000 Starter price does not overcome the competing-product restriction. FinEdge's Individual price is not a multi-user licence, while its Professional and Enterprise prices exceed the target.

## Written evidence required before any future onboarding

A provider must supply a signed, StockSamjho-specific agreement or order form that identifies:

1. The contracting legal entity, exact product/API version and all upstream data suppliers.
2. The exchange, segment, instrument universe, NIFTY 500 coverage, latency, intervals and historical depth.
3. The authority to grant each downstream right and any exchange/SEBI approvals or third-party restrictions.
4. Original filing/source identifiers and URLs, publication and availability timestamps, PIT/restatement history, durable issuer/security identity, currency and units.
5. Internal analysis and customer-facing display on web/mobile.
6. Derived analytics, rankings, screeners, signals, AI inference/grounding/RAG, model evaluation/training and attribution.
7. Paper/mock trading, simulated portfolio valuation and historical backtesting.
8. Server-side caching, retention, backup, deletion, corrections and termination handling.
9. Exports, customer APIs, redistribution, sublicensing and any restrictions on a competing research product.
10. Complete fixed, variable, user, site, medium, request, credit, tax and minimum-term fees.

No provider has been contacted, no quotation requested, and no account, API key, trial, subscription, agreement, purchase, provider request, ingestion, adapter or cache has been activated.

## Safety invariants

- Keep `MARKET_DATA_ACCESS_POLICY.status = NOT_CONFIGURED`; protected market-data routes remain fail-closed.
- Do not add provider credentials, secrets, accounts, adapters, ingestion, database tables, caches or scheduled provider requests.
- Do not change the ₹5,00,000 browser-local paper portfolio or its accounting.
- Do not change scanner parameters, candidate definitions, frozen research/holdout architecture, strategy parameters or backtest mathematics.
- No live trading, broker integration, signal-to-order path, main-branch write, merge or production action.
- Preview SSO remains enabled; no browser click-through, console or network validation is claimed.

This is an engineering source-readiness record, not legal advice. Obtain qualified legal/compliance review of the actual source-specific agreement before onboarding any provider.
