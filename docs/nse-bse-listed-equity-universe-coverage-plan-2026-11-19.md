# NSE + BSE Listed Equity Universe Coverage Plan

**Decision date:** 2026-11-19  
**Approved product scope:** All NSE and BSE listed equity shares, including SME-platform equity shares  
**Implementation status:** Scope accepted; source-rights and authoritative BSE master validation remain open  
**Change class:** Architecture / source-readiness documentation only

## 1. Product requirement

StockSamjho must not be limited to a hand-maintained watchlist, Nifty constituents, large caps, or the legacy 34-symbol search set.

The intended searchable universe is every currently listed equity share on:
- NSE main board / equity segment;
- NSE SME platform;
- BSE main board / equity segment; and
- BSE SME platform.

A security listed on both exchanges is one issuer/security identity with two exchange listings, not two unrelated companies. A security listed only on one exchange must still be discoverable. SME names must not be silently excluded because of low liquidity, limited history, unusual lot sizes, suspended trading, or a provider's coverage gaps.

This scope is specifically **equity shares**. ETFs, REITs, InvITs, preference shares, warrants, bonds, mutual-fund units and derivatives are out of scope for this phase unless separately approved.

## 2. Important distinction: universe coverage is not data coverage

StockSamjho must report these as separate dimensions:

1. **Universe membership:** Is the instrument confirmed as a currently listed equity security on NSE and/or BSE?
2. **Identity resolution:** Can the exchange listing be linked to a stable security identity without guessing?
3. **Market-data coverage:** Is licensed price/volume history available for the requested exchange, interval and date range?
4. **Fundamental coverage:** Are company filings and financial statements available for the requested reporting periods?
5. **Rights / entitlement:** Does the exact source contract permit this product's internal use, derived analytics, customer display, storage, caching, AI use and any paper-portfolio use?
6. **Point-in-time integrity:** Can the system prove what was known and available as of the historical date being analysed?

A security can be present in the universe while some or all data modules are unavailable. Never remove a valid listed security merely because a vendor does not cover it.

## 3. Public-source findings and limits

### NSE discovery candidates

NSE's official **Securities available for Trading** page currently exposes separate downloadable files for:
- securities available for the Equity segment;
- securities available for trading in SME;
- symbol-change and company-name-change records; and
- separate categories such as ETFs, IDRs, preference shares and warrants.

NSE's official **All Reports** page also lists daily CM-MII security files described as NSE listed securities and NSE-listed plus BSE-exclusive securities, along with a separate SME bhavcopy and SME band report. NSE's equity-market data/report documentation describes a Securities Master report with symbol, ISIN, security code and series.

These are promising official discovery/reference-data candidates. They are **not yet approved ingestion sources** for StockSamjho. Before production ingestion, confirm the current source terms, permitted automated retrieval, storage/retention, derived use and customer-facing display rights for the exact files and fields. Do not assume that public download availability grants redistribution or commercial product rights.

### BSE discovery gap

This review has not yet verified a current, authoritative, directly downloadable BSE main-board + BSE SME complete equity security master with a documented source, refresh cadence, stable identifiers, delisting/suspension lifecycle and StockSamjho usage rights.

Do not substitute a GitHub mirror, community CSV, unofficial scraper, broker instrument dump or a similarly named third-party file for an official BSE source. BSE coverage remains **SOURCE VALIDATION REQUIRED** until an authoritative BSE source and applicable rights are confirmed.

### Market-data policy

NSE's Data Sharing & Usage Policy says subscribers must execute a relevant agreement that captures intended use and the manner in which data is received, transmitted, handled or disseminated. It restricts redistribution except as agreed in that agreement. The current published policy also contains specific restrictions relevant to virtual trading/simulation use.

Therefore:
- a downloadable security list is not automatically a licence for a customer-facing market-data feed;
- an exchange-authorised vendor roster is not itself a downstream StockSamjho licence;
- a low-cost individual broker/API subscription is not a multi-user data-vending right; and
- no real-time feed, exchange price display, derived data, AI grounding, or simulated-portfolio mark may be enabled until the precise source and use are approved in writing.

The existing repository provider-rights audit remains authoritative for provider-specific findings. This plan does not override it.

## 4. Canonical security identity

Do not use ticker text as the primary key.

The normalized instrument model should support, where independently sourced:
- stable internal instrument ID;
- ISIN (nullable until verified);
- issuer/company identity (nullable until verified);
- exchange: NSE or BSE;
- exchange security code / token;
- exchange symbol;
- series / class;
- listing board or segment: MAIN_BOARD or SME;
- instrument type: EQUITY_SHARE;
- listing status and effective dates;
- source file / source record identity;
- source publication or retrieval timestamp;
- valid-from / valid-to dates for symbol, name, series and status changes;
- verification state and unresolved identity conflicts.

One issuer/security may have multiple exchange-listing records. Do not merge two securities solely because company names or symbols look similar. Do not infer ISIN from ticker, issuer name, suffix, or a broker symbol. Preserve corporate actions, symbol changes, name changes, relistings, mergers and delistings as dated identity events rather than overwriting history.

## 5. Universe lifecycle and coverage states

Every record must be classifiable using explicit states:

- `VERIFIED_ACTIVE`: authoritative source confirms current listing and identity is reconciled.
- `VERIFIED_SUSPENDED`: authoritative source confirms listing but trading is suspended / unavailable.
- `VERIFIED_DELISTED`: authoritative source confirms delisting with effective date.
- `IDENTITY_UNRESOLVED`: a listing exists but identity mapping is ambiguous or incomplete.
- `SOURCE_STALE`: last successful source snapshot exceeds the configured freshness threshold.
- `SOURCE_UNAVAILABLE`: authoritative source could not be refreshed.
- `RIGHTS_BLOCKED`: source data exists but the intended StockSamjho use is not licensed.
- `DATA_UNAVAILABLE`: security is in the universe but a requested price/fundamental module has no verified data.

Do not collapse these into one generic “stock not found” result. The UI should explain whether a stock is absent from the verified universe, identity is unresolved, a source is stale, or a data/rights module is unavailable.

## 6. Refresh and reconciliation design

The eventual ingestion service should:
1. Fetch only approved official source files through an explicitly permitted delivery method.
2. Store the untouched source artifact and cryptographic checksum with retrieval time and source-reported date.
3. Parse into a staging area; never overwrite the last known-good snapshot on a failed, empty, malformed or partial refresh.
4. Validate headers, row counts, required identifiers, duplicates, segment values, status values and date fields.
5. Reconcile NSE and BSE records by independently verified ISIN / issuer-security identity, not fuzzy name matching alone.
6. Record symbol, name, series, board, status and listing lifecycle changes as dated events.
7. Produce a coverage report: source date, retrieved time, active count by exchange/board, additions, removals, unresolved identities, duplicates and stale-source warnings.
8. Publish a new universe snapshot only after all configured integrity checks pass.
9. Keep prior snapshots immutable for audit and historical universe reconstruction, subject to source retention terms.
10. Fail closed: if a source is missing or rights are not approved, show the last permitted snapshot with its age or clearly report unavailable; never fabricate completeness.

No NSE/BSE historical membership may be inferred from today's constituents. Survivorship-sensitive research requires actual dated historical membership snapshots and must remain blocked when they are absent.

## 7. Provider architecture for all-stock data

The application should use a provider-neutral interface with independent capabilities, rather than one assumed all-in-one vendor:

- security master / reference data;
- EOD price and volume;
- intraday / real-time market data;
- corporate actions;
- company filings and financial statements;
- shareholding / insider / bulk-block disclosures;
- historical revisions and point-in-time evidence.

Each provider capability needs a rights record for:
- legal contracting entity and upstream source chain;
- NSE and BSE coverage, including SME coverage;
- data fields and historical depth;
- real-time, delayed or EOD status;
- single-user vs multi-user entitlement;
- internal use and customer display;
- derived analytics and AI/model grounding/evaluation;
- caching, retention, exports and deletion on termination;
- paper/mock-trading use;
- rate limits, SLA, pricing, taxes and renewal terms.

Provider onboarding must remain blocked until written permissions cover the intended StockSamjho use. Do not activate a trial, create an account, purchase a plan, request credentials, or change market-data policy as part of this documentation task.

## 8. Search and analysis behavior

The search experience should:
- accept company name, NSE symbol, BSE scrip code, BSE security ID and verified ISIN;
- show exchange and board/SME badge where supported by source data;
- distinguish same-name companies and multiple securities;
- show NSE and BSE listings under one verified instrument where appropriate;
- never auto-select a guessed match;
- expose the data-coverage panel before analysis.

A successful analysis response must state its actual coverage: source, exchange/listing, interval, latest timestamp, currency, reporting periods, missing modules and confidence limitations. Missing data remains unavailable; no silent fallback to unrelated symbols, stale caches, unlicensed endpoints or guessed values.

## 9. Acceptance gates

The all-stock universe is not complete until all of the following are demonstrated:

1. Official NSE main-board equity source identified, rights reviewed and refresh tested.
2. Official NSE SME source identified, rights reviewed and refresh tested.
3. Official BSE main-board equity source identified, rights reviewed and refresh tested.
4. Official BSE SME source identified, rights reviewed and refresh tested.
5. Reconciliation and identity-conflict tests pass across dual-listed and single-listed securities.
6. Symbol/name changes, suspensions, relistings and delistings are represented with effective dates.
7. Universe counts and exceptions are independently reconciled to exchange-published snapshots.
8. Historical membership snapshots exist before survivorship-aware backtests can pass.
9. Every market-data and fundamental module has a source-specific rights/coverage status.
10. No unlicensed market-data feed or paper-trading data path is enabled.

## 10. Current implementation boundary

This change is documentation-only. It does not:
- add a stock-universe importer or exchange scraper;
- call NSE/BSE endpoints or ingest exchange files;
- add Yahoo Finance or another unlicensed provider as a production source;
- configure API keys, credentials, accounts, subscriptions or vendor agreements;
- change `NOT_CONFIGURED` market-data access policy;
- change financial calculations, scoring, frozen research/holdout architecture, candidate definitions, strategy parameters or backtest mathematics;
- change the ₹5,00,000 virtual paper portfolio or its accounting;
- enable broker integration, real orders, live trading or production actions;
- modify main, production deployment, aliases, project settings or secrets.

**Next engineering milestone:** validate the official NSE and BSE main-board/SME security-master sources and their permitted use, then implement a tested, snapshot-based universe importer only for sources whose rights are approved. Market-data providers remain a separate onboarding gate.
