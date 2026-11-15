# Accord Fintech ACE Datafeed — Exchange Scope and Commercial Rights Audit

**Review date:** 2026-11-15  
**Status:** Priority RFQ candidate for further verification only; not an approved StockSamjho source  
**Scope:** Publicly documented product, exchange-vendor corroboration, and rights needed for StockSamjho internal research and future multi-user product use

## Executive decision

Accord Fintech's ACE Datafeed is worth adding to the vendor due-diligence/RFQ shortlist because Accord publicly describes FTP/API delivery, CSV/JSON formats, historical/intraday/EOD market information, company financials, shareholding, corporate announcements and products intended for financial portals and institutional customers.

However, the exchange-authorisation picture is product- and venue-specific:

- **NCDEX:** the current official NCDEX authorized-vendor page, last updated 13 November 2026, lists Accord Fintech Pvt Ltd in the **EOD / Delayed Data feed vendors** column, not the Real-Time Data feed vendors column. This is the only independently corroborated exchange-vendor status found in this review.
- **NSE:** the current official NSE authorized real-time vendor PDF lists 26 vendors and does **not** list Accord Fintech. Do not describe Accord as an NSE-authorized real-time vendor on the evidence currently available. This does not rule out a different product, non-real-time arrangement or a later authorization; request current documentary proof for the exact product and segment.
- **BSE:** Accord's own page claims BSE authorization, but the BSE self-data-feed portal describes a direct registration/KYC, plan selection, pricing/agreement and payment process. No current BSE source found in this review independently confirms Accord's precise vendor status or StockSamjho's downstream rights.
- **MCX:** Accord claims MCX authorization. MCX's official policy distinguishes vendors/distributors from redistributors and requires exchange agreements; the permitted display and redistribution routes are restricted. No current MCX source found in this review independently confirms Accord's exact authorization scope.

**Decision:** Keep ACE Datafeed as a potential RFQ candidate for company financials/corporate information and, separately, NCDEX EOD/delayed data. Do not treat it as an approved NSE/BSE/MCX equity market-data source, and do not enable an adapter. No public price or StockSamjho-specific licence was verified.

The runtime market-data gate must remain `NOT_CONFIGURED`.

## 1. What Accord publicly claims

Accord's ACE Datafeed pages describe:

- Delivery through FTP or API; its data-feed-solutions page says CSV or JSON formats are available.
- Market content including equity, derivatives, IPOs, commodities, currency, mutual funds, corporate announcements, news and other markets.
- Historical, intraday and end-of-day information.
- Listed-company financial information advertised as the latest five years of financials, eight quarterly results and shareholding.
- Intended customer categories including stock brokers, banks, portfolio managers, mutual funds/AMCs, wealth-management firms, financial publication/media and financial portals.

These are vendor-published product descriptions, not a verified StockSamjho API specification, complete coverage guarantee, upstream exchange licence, or downstream redistribution grant.

Accord's public pages identify the company as Accord Fintech Pvt. Ltd. and publish `info@accordfintech.com` and `+91-22-67834000`. No contact was made.

## 2. Exchange authorisation cross-check

| Venue | Public vendor claim / official evidence | Finding for StockSamjho |
|---|---|---|
| NSE | Accord's page claims NSE vendor status. NSE's official authorized real-time vendor PDF, updated on the NSE page on 22 October 2026, does not list Accord among its 26 named real-time vendors. | **Unverified for NSE real-time.** Require a current NSE/NDAL authorization letter, product name, segment scope and validity dates. Do not infer NSE rights from the vendor's own statement. |
| BSE | Accord's page claims BSE vendor status. BSE's Self Data Feed portal offers direct feed products and describes registration, KYC, plan selection, pricing/agreements and payment. | **Not independently corroborated here.** Require BSE's current vendor/distributor authorization and the exact upstream agreement/redistribution route for the proposed product. |
| MCX | Accord's page claims MCX vendor status. MCX's official policy defines vendor/distributors and redistributors, requires agreements and imposes display/redistribution restrictions. | **Scope unverified.** Require MCX confirmation of Accord's current authorization and the exact StockSamjho subscriber/redistributor path. |
| NCDEX | NCDEX's official authorized data-feed vendor page, last updated 13 November 2026, lists Accord Fintech Pvt Ltd under **EOD / Delayed Data feed vendors**; it appears in a separate column from Real-Time vendors. | **Confirmed listing for NCDEX EOD/delayed only.** Do not extend this to NCDEX real-time, non-display, public redistribution or any other exchange. |

The NSE vendor list is a real-time vendor roster; absence from that list is not proof that Accord has no other NSE-related commercial arrangement. It is, however, insufficient evidence to rely on the vendor's broad website claim for StockSamjho's proposed NSE real-time feed.

MCX's official page says redistributors need a redistribution agreement with MCX and cannot further sell/redistribute data to non-subscribers. For non-members, real-time or delayed data may be displayed on mobile apps or other electronic displays, while only delayed data is allowed for public website display; resale is prohibited. MCX also requires explicit permission for public internet display or devices not covered by the agreement.

NCDEX distinguishes vendors/distributors from sub-vendors/redistributors and identifies non-display use as a separately governed use category that may require a separate agreement and fees. The NCDEX EOD/delayed vendor listing does not itself grant StockSamjho a sub-vendor or non-display right.

## 3. Product fit and unresolved data questions

Potentially relevant capabilities, subject to exact product documentation:

- Daily and historical OHLCV for NSE/BSE listed equities.
- Corporate actions and exchange/company announcements.
- Company financial statements, quarterly results and shareholding.
- Issuer/instrument reference data and corporate identity mapping.

The public ACE Datafeed pages do **not** establish:

- A dated NIFTY 500 constituent universe, historical point-in-time constituent membership, or complete exchange/series/security-master coverage.
- Exact API endpoints, schema, pagination, rate limits, concurrency, timestamps, time zone or correction/revision behavior.
- Whether five years/eight quarters are available for every company and whether figures are standalone/consolidated, audited/unaudited or restated.
- Primary filing links, source document IDs, publication timestamps, period start/end, units, currency, or traceable revision lineage for each financial value.
- Independent issuer resolution (for example, a verified exchange instrument-to-ISIN and ISIN-to-issuer relationship).
- A point-in-time history suitable for leakage-free historical research.

Until those details are supplied and validated, ACE financial data cannot replace primary filings or satisfy StockSamjho's point-in-time evidence requirements.

## 4. Rights matrix — all StockSamjho-specific rights remain unverified

No public document located in this review grants StockSamjho any of the following rights:

| Intended use | Status |
|---|---|
| Internal research / non-display analytics | Unknown |
| Chart indicators and derived analytics | Unknown |
| AI/RAG explanation or model-assisted analysis | Unknown |
| Paper-trading / simulated portfolio marks | Unknown |
| Multi-user end-user display in a website or mobile app | Unknown |
| Public website display and mobile-app display | Unknown |
| Customer-facing API access | Unknown |
| Raw-data redistribution or resale | Unknown |
| Derived-data redistribution | Unknown |
| Historical storage, cache duration and backup retention | Unknown |
| Export/download, screenshots or customer reports | Unknown |
| Model training or retention in AI systems | Unknown |
| NIFTY 500-wide coverage and historical constituents | Unknown |

A general statement that a product serves financial portals, consumer web or institutional clients is not a substitute for a written StockSamjho-specific licence. Upstream exchange permission and downstream customer rights must be evidenced separately for every venue, segment, latency class, medium and use.

## 5. Required RFQ and evidence checklist

Before this provider can pass the source-readiness gate, request written answers and documentary evidence for:

### A. Legal entity and upstream exchange authority
1. Contracting legal entity name, registered address, GST details and authorized signatory.
2. Current vendor/distributor authorization from each relevant exchange, separately for NSE, BSE, MCX and NCDEX.
3. Exchange vendor code, product/segment scope, effective date, expiry date and any suspension/renewal conditions.
4. Explanation and documentary resolution of the NSE real-time roster discrepancy.
5. For NCDEX, confirmation that the proposed product is within the published EOD/delayed authorization and whether any separate real-time product exists.

### B. Data coverage and technical specification
1. Exact NIFTY 500 coverage, exchange, series, instrument types, symbol/ISIN fields and dated constituent/security-master snapshots.
2. Daily OHLCV history depth, intraday intervals, live/delayed latency, corporate actions and correction/backfill policy.
3. Financial statement coverage by issuer and period, including standalone/consolidated basis, audited status, restatements, currency, units, period dates and publication timestamps.
4. Original source document links/IDs, data lineage, source revision identifiers, fetched timestamps and correction history.
5. API/FTP documentation, schema, authentication method, pagination, rate limits, concurrency, SLA, uptime and support.

### C. Exact rights and commercial terms
1. Explicit permission for internal use, non-display analytics, technical indicators and derived analytics.
2. Explicit permission for AI/RAG use, including whether data can be sent to third-party model providers, stored, cached or used in generated customer explanations.
3. Explicit permission for paper-trading marks and simulated portfolio use.
4. Explicit permission for multi-user website/mobile display, public display, customer-facing API, raw redistribution and derived-data redistribution.
5. Retention, caching, backup, export and deletion limits; permitted number of users, devices and display media.
6. Exchange fees, per-user/per-device/per-medium charges, setup fees, annual minimums, taxes, trial limits, renewal, termination and audit rights.
7. A written total-cost quotation for StockSamjho's actual intended scope; no retail or desktop plan should be assumed to cover a multi-user fintech product.

### D. Source-quality acceptance
1. Provide representative documentation and sample records with permission for evaluation.
2. Validate identity, source authority, point-in-time publication, period, currency, units, source revision, correction lineage and completeness against official filings/exchange records.
3. Preserve `UNKNOWN`, `PIT_UNKNOWN` and `UNAVAILABLE` where evidence is missing. Do not infer issuer identity or fill missing financial values.

## 6. Decision and safe next action

- Add Accord Fintech / ACE Datafeed to the **potential RFQ list**, not the approved-provider list.
- The clearest independent fit found is NCDEX EOD/delayed vendor listing. That is not sufficient for the NIFTY 500 NSE/BSE equity market-data requirement.
- Treat company financials/corporate data as a separate diligence track: request provenance, primary-source links, point-in-time publication and correction history before considering it for fundamental analysis.
- No public price or StockSamjho-specific commercial rights were verified. The previously considered ₹2,000/month target remains unproven for a lawful multi-user product.
- No email, call, enquiry form, trial, account, API key, credentials, subscription, purchase, agreement or data activation was initiated.
- No provider adapter, ingestion, cache or entitlement record was created.
- Keep `MARKET_DATA_ACCESS_POLICY.status = NOT_CONFIGURED`; do not change the scanner's fail-closed `UNAVAILABLE` state.
- Do not change main, production, frozen research/holdout, strategy parameters, candidate definitions, backtest mathematics, the ₹5,00,000 browser-local paper portfolio, or any trading-execution boundary.

## 7. Sources

All links below were reviewed on 15 November 2026. They establish public product descriptions or exchange policy/listing facts only; they do not establish a StockSamjho licence.

1. Accord Fintech — ACE Datafeed: https://www.accordfintech.com/market-data-feed
2. Accord Fintech — Data Feed Solutions: https://www.accordfintech.com/static/data-feed-solutions.aspx
3. Accord Fintech — company and product overview: https://www.accordfintech.com/
4. NSE — Paid Real Time Data page and current authorized real-time vendor PDF (page states updated 22/10/2026): https://www.nseindia.com/static/market-data/real-time-data-subscription
5. NSE — Authorized Real Time Data Vendors PDF: https://nsearchives.nseindia.com/web/sites/default/files/inline-files/Authorized_Realtime_Data_Vendors.pdf
6. BSE — Self Data Feed portal: https://marketdata.bseindia.com/
7. MCX — Data Feed policy, subscriber categories, display/redistribution and agreement requirements: https://www.mcxindia.com/technology/datafeed
8. NCDEX — Authorized Data Feed Vendors (page states last updated 13/11/2026): https://ncdex.com/data-feed/ncdex-authorized-data-feed-vendors
9. NCDEX — Type of subscribers and non-display-use policy: https://ncdex.com/tech/type_of_subscribers

**Bottom line:** ACE Datafeed is a credible lead for a carefully scoped vendor enquiry, but the available evidence does not establish lawful, complete NIFTY 500 equity access or StockSamjho's required multi-user, AI/derived-use and redistribution rights. Keep the data gate closed until the exact upstream and downstream permissions are documented and separately approved.
