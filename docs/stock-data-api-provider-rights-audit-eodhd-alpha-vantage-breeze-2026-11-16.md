# StockSamjho market-data vendor rights audit: EODHD, Alpha Vantage and ICICI Breeze

**Reviewed:** 16 November 2026  
**Scope:** Public vendor documentation, published pricing and usage rights for a potential Indian-equity research service. This is a desk audit, not legal advice, a licence determination, a vendor quote or a data-quality certification.

## Executive decision

No newly reviewed provider is approved for StockSamjho ingestion or shared-user display.

| Provider | Technical fit evidenced publicly | Rights / price position | StockSamjho decision |
|---|---|---|---|
| EOD Historical Data (EODHD) | Global EOD and fundamentals APIs; public documentation gives an Indian NSE fundamentals example and exposes exchange/ticker-list APIs | Personal plans are personal-use only. Published commercial Internal Use is USD 399/month and expressly excludes external sharing; Enterprise is USD 2,499/month; Custom starts from USD 399/month but requires a quote and source-specific agreement. Public pages contain a material ambiguity about the provenance of pricing data. | **Not approved.** Commercially unsuitable for the ₹2,000/month target on published tiers; Custom rights, India exchange coverage and price provenance require written confirmation. |
| Alpha Vantage | Global equity time-series APIs; documentation includes a BSE example for RELIANCE.BSE and states 100,000+ symbols | Terms grant personal, non-commercial use by default and classify broader/business/third-party access as commercial; vendor directs commercial users to sales. No public commercial price or Nifty 500 coverage guarantee was established. | **Conditional RFQ candidate only.** Do not use a personal/free key for StockSamjho. Obtain written Indian-exchange rights, full-universe coverage and price first. |
| ICICI Direct Breeze | Broker API documentation describes NSE equity/F&O market data, WebSockets and historical data | Free for eligible ICICI Direct customers, but the API is framed for individual/personal trading; third-party trading-platform integration is expressly prohibited. Public pages do not establish multi-user research display, redistribution, AI/derived analytics or paper-mark rights. BSE/MCX securities are not available in the API reference. | **Not approved as a shared research feed.** Keep broker integration out of scope; non-trading data rights remain unresolved. |

Upstox and Dhan are not re-audited here: the existing PR #72 and PR #78 audits already leave the relevant StockSamjho multi-user rights unverified and fail-closed.

## 1. EOD Historical Data (EODHD)

### Technical and India coverage evidence

- EODHD documents APIs for EOD prices, intraday data, fundamentals, exchange metadata and exchange ticker lists.
- Its public non-US fundamentals announcement explicitly uses Infosys Limited traded on the National Stock Exchange of India as an example. This establishes at least one India/NSE example, not full Nifty 500 coverage.
- The exchange API documents a supported-exchange list and ticker-list endpoint, with fields including ticker code, exchange, trading currency and ISIN. A current full Indian ticker export was not retrieved in this audit; no count or coverage percentage is asserted.
- The fundamental-field glossary documents quarterly/yearly financial statements and fields including period-end `date`, `filing_date`, `currency_symbol`, and a fundamentals-file `UpdatedAt` field. It also warns that some reported/derived financial fields vary by company and instructs users to check original company reports for calculation logic.
- The same glossary says an ISIN can be shared by ticker codes for the same company on different exchanges. ISIN alone is therefore not a sufficient exchange-security key.

### Usage rights and published pricing

- EODHD's personal-use FAQ and Terms restrict personal plans to an individual's own personal investment activity. Sharing, redistribution, display or granting others access is prohibited. Use for a business, on behalf of others, or by several people is commercial.
- Published personal prices include USD 19.99/month for EOD Historical, USD 59.99/month for Fundamentals and USD 99.99/month for All-in-One. These are **not** commercial licence prices and cannot be used as a proxy for StockSamjho rights.
- The commercial pricing page lists:
  - **Internal Use:** USD 399/month (USD 3,990/year). The page expressly says this package is restricted to use within the company; external display/sharing is not allowed.
  - **Enterprise:** USD 2,499/month (USD 24,990/year).
  - **Custom:** from USD 399/month, by request. The page says partial client downloads are available with Custom and recommends Custom when a signed agreement is required. The starting price does not itself establish that the StockSamjho use case is covered.
- The published commercial Internal Use tier is already far above the ₹2,000/month target and does not permit serving external users. Enterprise is also far above that target. Custom pricing and rights remain quote-dependent.

### Important price-provenance ambiguity

The same EODHD commercial-pricing page makes two statements that must be reconciled before relying on the data:

1. It says EOD/delayed data are procured through direct contracts with various exchanges, naming Nasdaq Cloud API for the US, LSE for the UK and Cboe for Europe, and referring to more than 60 exchanges.
2. Its disclaimer says it is **not using exchange data feeds for pricing data**, instead describing OTC, peer-to-peer trades and trading-platform sources aggregated using VWAP.

The public page does not reconcile those statements for Indian NSE/BSE instruments. Do not infer that the Indian price feed is exchange-direct, exchange-licensed, executable, or appropriate as a canonical market close. Obtain a written, India-specific source and rights explanation.

### Point-in-time and filing-evidence limitations

The presence of a `filing_date` field is useful metadata, but the public material reviewed does not establish, for Indian issuers, all of the following: original exchange/company filing URL, first-publication timestamp, historical restatement/revision lineage, immutable point-in-time snapshots, consolidated-versus-standalone basis for every record, or reproducible as-of semantics. `UpdatedAt` is described as the date the fundamentals file was last updated; it is not by itself proof of when every underlying fact first became public.

Therefore EODHD fundamentals may be considered a secondary cross-check only after a sample-by-sample reconciliation against original filings. They cannot currently satisfy StockSamjho's canonical PIT evidence gate.

**EODHD conclusion:** do not subscribe or integrate. A future quote request would need to identify StockSamjho as a multi-user research application and explicitly ask about NSE and BSE upstream rights, client display, derived metrics, AI processing, caching/retention, historical revisions, and the conflicting price-provenance statements. No contact or quote request was sent.

## 2. Alpha Vantage

### Technical and India coverage evidence

- The official API documentation describes global equity daily/weekly/monthly and intraday time series and gives a specific India example: `RELIANCE.BSE` for BSE.
- The documentation states that its global symbol universe exceeds 100,000 symbols. That aggregate statement does not establish how many Nifty 500 constituents are available, whether NSE symbols are supported, or whether both NSE and BSE listings have complete historical coverage.
- The documentation includes fundamental endpoints such as company overview, income statement, balance sheet and cash flow. The reviewed pages do not establish an India-specific issuer-by-issuer filing-source map or complete point-in-time/restatement guarantee.
- The free API support page states a limit of 25 requests per day for the general free service. That is not sufficient evidence of a suitable 500-stock production feed and does not change the commercial-use restriction.

### Usage rights

- Alpha Vantage's Terms of Service grant a personal, non-commercial licence by default.
- The terms define commercial use broadly, including activity beyond personal use, use on behalf of a business/association, and making platform information accessible directly or indirectly to other people/entities. They direct commercial users to `premium@alphavantage.co`.
- Alpha Vantage's market-data policy specifically describes its Nasdaq licence for real-time and 15-minute delayed **US** market data and directs business/commercial users to its sales onboarding process. That US-specific licence statement must not be extrapolated to Indian BSE or NSE data rights.
- The public documentation reviewed did not provide a commercial price for the proposed Indian-equity use case.

**Alpha Vantage conclusion:** retain only as a conditional RFQ candidate for a possible BSE/global data component. Before any use, require written confirmation of NSE and BSE coverage, the actual upstream source and exchange entitlements for each Indian dataset, commercial multi-user display and derived-output rights, AI processing, storage/cache and retention rights, PIT/restatement semantics, and total commercial price. Do not use the free or personal plan for StockSamjho. No account, key, quote or subscription was requested.

## 3. ICICI Direct Breeze (broker API; not a data-vendor approval)

- ICICI Direct's public page describes Breeze as free for ICICI Direct customers and advertises historical and streaming market data. The FAQ states a 100-calls-per-minute and 5,000-calls-per-day API limit; order-placement limits are separately described and are irrelevant to this research-only audit.
- The API reference says the available cash-equity and derivatives securities are on NSE and explicitly says BSE and MCX securities are not available.
- ICICI Direct's FAQ says Breeze is provided for individual and personal trading purposes and that integration with third-party applications **for trading** is strictly prohibited.
- That trading-specific prohibition should not be overstated as a complete ruling on every non-trading research use. However, the public material reviewed does not grant StockSamjho a right to expose one customer's feed to other users, redistribute data, store/cache it for a multi-user service, publish derived analytics, send it to AI processing, or use it for paper-portfolio marks.

**Breeze conclusion:** not approved as a shared StockSamjho data source. Do not connect a broker account or credentials. A separate, explicit written response from ICICI would be required to settle any non-trading data-use question; no such response was requested.

## 4. Required written answers before any provider can pass

For any future vendor evaluation, obtain source-specific written answers covering:

1. Exact legal provider entity and upstream data source for each NSE/BSE dataset; whether the feed is exchange-direct, licensed redistribution, consolidated, broker-sourced, OTC-derived or indicative.
2. Current Nifty 500 constituent coverage, including NSE/BSE listing identifiers, suspended/delisted instruments, corporate actions and historical continuity.
3. Commercial rights for a multi-user application: registered and paying users, public display, internal use, derived ratios/rankings/signals, screenshots/reports, exports/downloads, AI/LLM processing and onward redistribution.
4. Storage, caching, backup, retention after cancellation, historical corrections and permitted audit/provenance records.
5. Point-in-time guarantees: original filing URL, filing/publication timestamp, period end, standalone/consolidated basis, currency, units, restatement/version lineage and the exact historical snapshot semantics.
6. Per-dataset SLA, rate limits, completeness, correction policy, uptime/support, tax, setup fees, minimum term and a written all-in price.
7. Confirmation that the quoted licence covers the actual StockSamjho workflow, not merely a single personal account, broker terminal, developer API or internal company dashboard.

## 5. Fail-closed implementation decision

- Keep `MARKET_DATA_ACCESS_POLICY.status = NOT_CONFIGURED`.
- Keep provider entitlement, source identity, exchange scope, currency, units, reporting basis, period, revision lineage and PIT status as UNKNOWN/UNAVAILABLE until independently evidenced and licensed.
- Do not create an adapter, ingest a sample feed, add credentials, create accounts, cache vendor data, or change any data gate based on this audit.
- Do not use a personal plan, free API key, broker account, or a provider's technical endpoint as evidence of commercial permission.
- Preserve the ₹5,00,000 browser-local paper portfolio and all paper-ledger accounting rules. No live market prices are introduced into paper marks.
- No trading, broker integration, production action, subscription, purchase, vendor agreement or contact was made.

## Sources reviewed on 16 November 2026

### EODHD
- Commercial use FAQ: https://eodhd.com/help/commercial
- Personal use FAQ: https://eodhd.com/help/personal-use
- Terms and Conditions: https://eodhd.com/financial-apis/terms-conditions
- Commercial pricing and licence tiers: https://eodhd.com/commercial-pricing
- Personal pricing: https://eodhd.com/pricing/
- Supported exchanges and ticker-list API: https://eodhd.com/financial-apis/exchanges-api-list-of-tickers-and-trading-hours
- Fundamentals glossary (including `filing_date`, currency and field caveats): https://eodhd.com/financial-academy/financial-faq/fundamentals-glossary-common-stock
- Non-US fundamentals announcement with Infosys/NSE example: https://eodhd.com/financial-apis-blog/huge-update-for-non-us-fundamentals-data

### Alpha Vantage
- Terms of Service: https://www.alphavantage.co/terms_of_service/
- Market Data Policies: https://www.alphavantage.co/realtime_data_policy/
- API documentation (global equities and RELIANCE.BSE example): https://www.alphavantage.co/documentation/
- Free API key and rate-limit FAQ: https://www.alphavantage.co/support/api-key/

### ICICI Direct Breeze
- Breeze API overview and FAQ: https://www.icicidirect.com/futures-and-options/api/breeze
- Official API reference: https://api.icicidirect.com/breezeapi/documents/index.html
- Third-party trading integration FAQ: https://www.icicidirect.com/faqs/fno/how-can-i-use-a-third-party-platform-to-trade-via-breeze-api

### Existing audits not duplicated
- Upstox, Dhan, Zerodha Kite, FYERS and Twelve Data are covered in the preceding provider-rights audit stack (PRs #72, #78 and #79): https://github.com/Chandan626k/compounder-dna-live/pulls
