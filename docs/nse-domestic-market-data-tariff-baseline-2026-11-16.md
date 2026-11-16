# NSE Domestic Market-Data Tariff Baseline — StockSamjho

**Review date:** 16 November 2026  
**Status:** Official public tariff research only; no subscription, quote request, account, licence or data access activated  
**Scope:** NSE Data & Analytics domestic tariff effective 1 April 2026, to assess the direct-exchange route for StockSamjho's commercial multi-user product

## Executive decision

**The direct NSE licensing route is not compatible with the current ₹2,000/month target on the published domestic tariff.** Even the published EOD Capital Market product is ₹1,00,000 per annum per site/per display medium (about ₹8,333/month before taxes). The published historical-trade-data product is ₹1,10,000 per annum per site (about ₹9,167/month before taxes). Real-time non-display, internal-display and data-vendor routes are substantially more expensive.

This does not prove that every authorised vendor's bundled commercial offer must exceed ₹2,000/month. A vendor may have a different agreement or bundled pricing. However, a low API subscription price is not proof that the vendor can pass through the exact downstream rights StockSamjho needs. Keep each provider at `UNKNOWN` or its existing restricted status until its upstream authority and StockSamjho-specific written permissions are established.

## Official sources

1. [NSE Products Tariff — domestic clients](https://betanseapi.nseindia.com/static/market-data/products-tariff) — page states prices effective 1 April 2026 and was updated 22 July 2026 when reviewed.
2. [NSE Domestic Market Data Pricing PDF](https://nsearchives.nseindia.com//web/mediaattachment/2026-04/Download_Pricing_file_-_Domestic_clients_20260424122229.pdf) — 13-page tariff schedule, labelled Non-Confidential, effective 1 April 2026.
3. [NSE Data Sharing & Usage Policy](https://betanseapi.nseindia.com/static/market-data/nse-data-policy).

The amounts below are reproduced from the domestic tariff PDF. They are exclusive of applicable taxes/levies. Monthly equivalents are simple annual-price divisions by 12, not a quoted monthly payment option.

## Relevant published tariff lines

| Product / usage category | Published domestic fee | Approx. monthly equivalent | Scope caveat |
|---|---:|---:|---|
| EOD Capital Market data | ₹1,00,000/year | ₹8,333/month | Per site and per display medium; website and mobile are separate media |
| Historical Capital Market trade data | ₹1,10,000/year | ₹9,167/month | Per site |
| 15-minute delayed Capital Market L1, non-display | ₹1,40,000/year | ₹11,667/month | Per site |
| Real-time Capital Market L1, non-display | ₹23,90,000/year | ₹1,99,167/month | Enterprise, single site |
| Real-time Capital Market L1, non-display | ₹37,60,000/year | ₹3,13,333/month | Global, multiple sites |
| Real-time Capital Market L1, internal display | ₹24,40,000/year | ₹2,03,333/month | Enterprise, single site |
| Real-time Capital Market L1, internal display | ₹34,50,000/year | ₹2,87,500/month | Global, multiple sites |
| Snapshot real-time L1 — open website | ₹29,20,000/year | ₹2,43,333/month | Per website |
| Snapshot real-time L1 — mobile | ₹23,45,000/year | ₹1,95,417/month | Per application |
| Snapshot 1-minute Capital Market | ₹16,00,000/year | ₹1,33,333/month | Per display medium |
| Snapshot 5-minute Capital Market | ₹4,20,000/year | ₹35,000/month | Per display medium |
| Snapshot 1-minute, 15-minute delayed Capital Market | ₹1,20,000/year | ₹10,000/month | Per display medium |

The tariff also lists a Data Vendor Capital Market L1 fixed fee of ₹25,50,000/year. Its variable domestic end-user fee is ₹1,145 per user/month for a terminal and ₹875 per user/month for a software/charting application. These are separate vendor-category price components; the correct category and all applicable charges must be confirmed with NSE Data & Analytics for the actual contracting and distribution model. The mobile data-vendor product is not offered standalone in the tariff.

The PDF notes that some additional delivery channels attract an additional 50% of the relevant product fixed fee. The EOD table expressly treats website and mobile as different display media. Do not assume a single quoted EOD fee covers both web and mobile.

## Licensing and delivery conditions

The tariff PDF states that where a data vendor provides data to its clients in feed form, written consent and a prior licence/agreement from NSE Data & Analytics Ltd are mandatory.

The tariff is a price schedule, not a licence grant or proof that StockSamjho is eligible for a particular category. The applicable product, segment, use classification, user population, distribution channel, latency, historical depth, display rights, derived analytics and any additional delivery channel must be specified in the actual agreement.

The schedule above is NSE-only. It does not establish BSE pricing or permissions, and it does not include any BSE licence, taxes, vendor charges, infrastructure, connectivity or other costs.

## StockSamjho assessment

- **Direct NSE EOD price data:** Not within the ₹2,000/month target at the published ₹1,00,000/year per-site/per-medium tariff.
- **Direct NSE historical trade data:** Not within budget at ₹1,10,000/year per site.
- **Direct delayed or real-time market-data use:** Not within budget on the published categories shown above.
- **Direct multi-user data-vendor route:** The published CM L1 fixed fee and per-user charges are materially above the target; obtain an official scope-specific quote only if the business later approves a larger budget.
- **Authorised third-party vendors:** Still worth evaluating only where the vendor can document its upstream source authority and provide a written StockSamjho-specific licence for the precise end-user, derived-data, AI, storage, paper/simulation and display scope.

This tariff does not authorise any provider adapter, ingestion, cache, data display, paper-portfolio valuation or simulation. It does not change the existing market-data access policy.

## Required evidence before any future onboarding

Obtain a written proposal that identifies:

1. The contracting legal entity and the exact NSE/BSE product or authorised-vendor feed.
2. The data segments, universe, instruments, latency class, historical depth and delivery method.
3. Whether the fee is per site, per medium, per user, per application, per API key or per request.
4. The permitted internal analysis, customer-facing display, derived analytics, AI inference/grounding, paper/mock trading, portfolio valuation, exports and redistribution rights.
5. Storage, cache, retention, backups, deletion, termination and correction/restatement obligations.
6. All fixed, variable, minimum, channel, user, tax and one-time fees.
7. The upstream exchange consent/licence and the vendor's authority to grant each downstream right.

Do not infer entitlement from a vendor roster entry, a low retail API price, a successful HTTP response or a generic statement that commercial use is supported.

## Safety invariants

- Keep `MARKET_DATA_ACCESS_POLICY.status = NOT_CONFIGURED`.
- No account, API key, subscription, quote request, purchase, licence, agreement or ingestion was initiated.
- No NSE/BSE scraping, undocumented endpoint or unlicensed data access.
- No change to the ₹5,00,000 browser-local paper portfolio or its accounting.
- No change to scanner parameters, candidate definitions, frozen research/holdout architecture or backtest mathematics.
- No live trading, broker integration, main-branch write or production action.

This is an engineering cost and source-rights record, not legal advice. Obtain qualified legal/compliance review and the actual source-specific agreement before relying on any market-data entitlement.
