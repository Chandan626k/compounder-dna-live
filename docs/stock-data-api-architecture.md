# StockSamjho Data API — Architecture and Source-Readiness Plan

**Status:** Design only; no provider is authorized or configured  
**Date:** 2026-11-14  
**Scope:** Internal StockSamjho data service first; future multi-tenant commercial API only after separate licensing and security approval

## 1. Executive decision

Build a StockSamjho-owned API as the stable interface between data providers, the validated data store, the scanner, and (later) external API customers.

The API is our software layer; it is not itself a source of exchange data. It must never manufacture, scrape, or silently infer market facts. A provider adapter may be enabled only when its specific data, venue, purpose, storage, display, derived-use and redistribution rights have been verified.

**Current state remains fail-closed.** The repository's `lib/market-data-access-policy.js` declares `NOT_CONFIGURED` and returns a structured 503 response without making a provider request. The scanner likewise returns `UNAVAILABLE` and generates no signals. This behavior must remain until a source-specific authorization record and adapter pass review.

No provider purchase, subscription, account, credential, agreement, ingestion, production setting, deployment, or live-trading action is authorized by this document.

## 2. Live repository audit

The audit was performed against the current PR #60 stack at commit `d8e74fa8446872f863d1c30f5f09d489079a9d3e`, not against an old local snapshot.

### Existing components and gaps

| Area | Observed state | Consequence |
|---|---|---|
| Market-data access policy | `lib/market-data-access-policy.js` returns `NOT_CONFIGURED` / 503 | Correct fail-closed behavior; preserve it |
| Legacy market provider | `lib/market-data-provider.js` calls Yahoo Finance chart endpoints | Not an authorized production source; do not activate |
| Host fallback | Yahoo `query1` and `query2` are two hosts for the same provider | Not independent-provider redundancy |
| Data foundation | `api/data-foundation.js` contains Yahoo summary/history logic behind the unavailable gate | No validated, authorized production data path |
| Data route | `api/data.js` contains legacy Yahoo chart, search, summary and scan logic after an early unavailable response | Keep blocked; do not treat the legacy code as a supported API |
| Scanner | `lib/scanner-engine-v2.js` exposes a 50-symbol default universe and returns `UNAVAILABLE` while access is not configured | NIFTY 500 coverage is not implemented or validated |
| Scanner route | `api/scan.js` checks the access gate before scanning | No signal should be generated while the gate is closed |
| Financial evidence | No independently authorized filing adapter or verified universal security-to-issuer resolver is connected | Fundamental evidence must remain `UNKNOWN`, `PIT_UNKNOWN` or `UNAVAILABLE` when requirements are missing |
| Cache/rate limits | Current helpers use process-local in-memory maps | Not a durable multi-instance or multi-tenant quota system |
| Server health | Health routes are liveness/configuration checks, not provider probes | A healthy HTTP response must not be described as healthy market data |
| Public API security | Current unavailable responses are not a commercial multi-tenant API security boundary | Do not expose data endpoints to external customers yet |

The existing Yahoo code may remain for controlled test and migration work, but its presence or a successful HTTP response does not establish licensing, entitlement, authoritative provenance, point-in-time validity or production readiness.

### Explicitly not established

- No authorized real-time, delayed or historical exchange feed is connected.
- No verified NIFTY 500 constituent/security-master source is connected.
- No authoritative universal ISIN-to-CIN mapping source is connected.
- No independently validated filing ingestion adapter is connected.
- No source-specific commercial redistribution or derived-data entitlement is recorded.
- No external customer authentication, tenant quota, billing, or usage-metering system is ready.

## 3. Target architecture

```text
Authorized provider(s)
        |
        v
Provider adapters (one adapter per documented provider contract)
        |
        v
Entitlement and capability registry
        |
        v
Ingestion validation
  - identity and exchange/series
  - source timestamp and publication time
  - timezone, currency and units
  - session and interval
  - completeness, duplicates and stale data
  - adjustment/corporate-action basis
  - source revision and provenance
        |
        v
Canonical data store
  - instrument/security master
  - quotes and OHLCV bars
  - corporate actions
  - company filings and financial periods
  - provenance and entitlement metadata
        |
        v
StockSamjho Data API
        |
        +----> Internal scanner and analysis
        |
        +----> Future external API gateway (disabled until licensed)
```

Keep market-data feeds, exchange/security identity, company/issuer identity, and filing evidence as distinct concepts. A ticker string is not a durable issuer identity. An exchange instrument identifier or ISIN must not be guessed, and an ISIN-to-CIN relationship must not be inferred from a name match.

## 4. Provider adapter contract

Each adapter must declare capabilities before it can be selected:

- Provider and documented API/product name.
- Venue, segment, instrument coverage and supported intervals.
- Real-time, delayed or historical classification.
- Source timestamp semantics, timezone and session calendar.
- Currency, price scale, quantity/volume units and adjustment behavior.
- Rate limits, concurrency, pagination and retention constraints.
- Permitted internal use, non-display use, end-user display, derived analytics, storage/cache, and redistribution.
- Contract/agreement reference and validity dates, stored in a controlled entitlement registry (not in public logs or source code).
- Failure semantics and whether a genuinely independent licensed fallback exists.

Required adapter capabilities are explicit and optional, for example: `getQuote`, `getCandles`, `getInstrumentMaster`, `getCorporateActions`, `getFinancialPeriods`, and `getFilings`. An adapter must not advertise a capability it cannot prove.

A provider can be technically reachable but commercially unauthorized. Network success must never set entitlement to `READY`. Provider quality, provenance, identity, and license entitlement are separate gates.

Fallback is permitted only to another independent provider with compatible rights and equivalent coverage. Two hostnames for the same provider do not qualify as independent fallback.

## 5. Canonical response envelope

All future data responses should use one versioned envelope. The example below is a schema illustration, not a real market record:

```json
{
  "apiVersion": "v1",
  "status": "AVAILABLE | PARTIAL | UNAVAILABLE",
  "instrument": {
    "exchange": null,
    "symbol": null,
    "series": null,
    "isin": null
  },
  "source": {
    "provider": null,
    "sourceRecordId": null,
    "entitlementStatus": "UNKNOWN"
  },
  "time": {
    "asOf": null,
    "publishedAt": null,
    "fetchedAt": null,
    "timezone": null
  },
  "measurement": {
    "currency": null,
    "priceUnit": null,
    "volumeUnit": null,
    "interval": null,
    "adjustmentBasis": "UNKNOWN"
  },
  "coverage": {
    "expected": null,
    "received": null,
    "missing": null
  },
  "revision": {
    "sourceRevision": null,
    "contentHash": null
  },
  "data": [],
  "warnings": []
}
```

Rules:

1. Unknown fields stay `null` or an explicit `UNKNOWN` status; never fill them from a ticker suffix, a guessed timezone, a default currency, or a nearby company name.
2. `asOf`, `publishedAt` and `fetchedAt` are distinct. Fetch time is not market time or publication time.
3. Every bar/financial value carries an unambiguous unit, period and currency where applicable.
4. Partial coverage is reported as partial; missing bars or periods are not silently interpolated.
5. Raw provider identifiers and source revisions are preserved only when actually supplied by that provider.
6. Derived values identify the exact input revisions and deterministic calculation version used.
7. A response can be technically valid and still be unavailable for a particular tenant because its entitlement does not allow that use.

## 6. Proposed API surface

These are future contracts, not live routes. They must return the existing structured unavailable response until the matching source and entitlement are ready.

| Proposed route | Purpose | Required gate |
|---|---|---|
| `GET /api/v1/health` | Service liveness and configuration state only | Must not claim a provider probe unless one was actually performed |
| `GET /api/v1/instruments/{exchange}/{symbol}` | Resolve exchange instrument identity | Authoritative security-master source and dated identity record |
| `GET /api/v1/market/quotes?symbols=...` | Quote snapshots | Quote entitlement, venue/segment scope, freshness and display rights |
| `GET /api/v1/market/candles?symbol=...&interval=...&from=...&to=...` | Historical/intraday OHLCV | Historical/intraday entitlement, interval and retention scope |
| `GET /api/v1/corporate-actions/{symbol}` | Splits, dividends and other actions | Authoritative source, effective dates and adjustment policy |
| `GET /api/v1/fundamentals/{symbol}?period=...` | Company financial periods and ratios | Authoritative filing evidence, issuer identity, PIT, units and currency |
| `GET /api/v1/filings/{symbol}` | Filing metadata/documents | Document source, publication time, issuer mapping and permitted storage/use |
| `GET /api/v1/usage` | Tenant's API quota and usage | Authenticated tenant scope; no provider data returned |

Use a separate internal service identity for StockSamjho modules. External API keys, if ever introduced, must be tenant-scoped and must not be reused as broker credentials.

## 7. Commercial multi-tenant boundary

External access is a separate release, not an automatic consequence of building the internal API.

Required controls before any public customer access:

- Tenant authentication and scoped API keys; store only secure hashes/identifiers, never plaintext keys.
- Key expiry, revocation and rotation; no credentials in Git, logs or chat.
- Distributed rate limits, quotas and usage metering; process-local in-memory counters are insufficient.
- Per-tenant product entitlements: venue, segment, instruments, latency, history, display, non-display, derived analytics, retention and redistribution.
- CORS allowlist, request validation, payload limits, abuse controls and audit trails.
- Isolation of customer data, API keys, usage and cached results.
- Cache behavior determined by each source agreement. Do not cache or share across tenants when the license does not permit it.
- Explicit terms, privacy policy, support process and incident response before launch.
- No public raw-data or derived-data endpoint until the relevant agreement explicitly permits that use.

The ability to calculate an indicator does not automatically grant the right to redistribute the underlying feed or the derived result.

## 8. Data quality and decision gates

Before a data record is served as usable:

1. Resolve the exact exchange instrument and, separately, the issuer where needed.
2. Validate source, publication and market timestamps without coercion.
3. Validate exchange session, timezone, interval and candle ordering.
4. Validate currency, price scale, quantity and volume units.
5. Detect duplicate, missing, stale, out-of-session and malformed records.
6. Record adjustment/corporate-action basis.
7. Verify source revision and lineage where the source provides them.
8. Verify source entitlement for the exact operation and tenant.
9. Preserve partial or unavailable status rather than manufacturing completeness.

The scanner must require the data coverage and freshness appropriate to its existing unchanged rules. This API project does not authorize changing candidate definitions, strategy parameters, ranking thresholds, backtest mathematics, costs, slippage or frozen holdout/research architecture.

NIFTY 500 must not be represented as covered until a dated, authoritative and licensed constituent/security master has been obtained, normalized, reconciled and tested.

## 9. Source and licensing readiness register

| Candidate | Current assessment | Next permitted action |
|---|---|---|
| Angel One SmartAPI | User has an Angel One broker account, but personal account access is not proof of multi-user commercial redistribution or derived-data rights | Obtain written confirmation of exact StockSamjho internal and future multi-user commercial uses before adapter activation |
| NSE paid master/feed products | Official product material describes paid master data and access prerequisites; the required agreement and access are not in place | Review product scope and agreement only; no registration, key exchange, static-IP setup or purchase without separate approval |
| BSE data products | Registration, plan, agreement and pricing conditions need to be established for the exact intended use | No account, plan or payment without separate approval |
| MCA Company Master Data OGD | Catalog metadata exists, but the current download/API path has not been verified as an accessible production feed | Re-verify the official downloadable/API artifact and usage terms before any ingestion |
| Yahoo Finance | Existing legacy code is not an authorized commercial source for this product | Keep blocked; do not scrape or use as a fallback |

Reference policies and product documentation:

- Angel One SmartAPI documentation: https://smartapi.angelone.in/docs
- Angel One terms: https://www.angelone.in/terms-and-conditions
- NSE data sharing and usage policy: https://betanseapi.nseindia.com/static/market-data/nse-data-policy
- NSE paid master data: https://betanseapi.nseindia.com/static/market-data/paid-master-data
- NSE paid master data technical specification: https://nsearchives.nseindia.com/web/mediaattachment/2026-08/NSE-Masters_Data-v1.10_20260814161753.pdf
- BSE data products: https://www.bseindia.com/marketdata/
- MCA Company Master Data catalog: https://ap.data.gov.in/catalog/company-master-data

A listed URL is a research reference, not evidence that StockSamjho has purchased, subscribed to, or been granted access to the product.

## 10. Phased implementation and acceptance

### Phase 0 — Architecture and audit (this change)

- Record current provider/access limitations.
- Define the adapter, canonical envelope, API surface and tenant boundary.
- Keep all runtime market-data access blocked.

### Phase 1 — Contract-only implementation

- Add versioned schema validators and provider capability types.
- Add deterministic synthetic fixtures for unit tests only; clearly mark them as test fixtures.
- Test unknown, partial, malformed, stale, wrong-currency, wrong-unit and unentitled cases.
- No live provider calls, ingestion, secrets or production data.

### Phase 2 — Authorized provider onboarding

- Require a written source-specific agreement/permission covering the intended internal and multi-user commercial uses.
- Record venue, segment, latency, retention, storage, display, derived-use and redistribution entitlements.
- Require separate user approval before any purchase, account, subscription, credential or activation.
- Implement only documented provider APIs and test against the exact permitted scope.

### Phase 3 — Ingestion and canonical storage

- Add durable ingestion, deduplication, source revisions, PIT lineage and quality checks.
- Apply source-specific cache/retention policy.
- Do not promote incomplete or unentitled records.

### Phase 4 — Internal API and scanner integration

- Enable only authorized internal endpoints.
- Run coverage, freshness, currency, period, identity and failure tests.
- Keep scanner rules and research mathematics unchanged.
- Paper trading remains manual, browser-local and isolated; no signal-to-order path.

### Phase 5 — External commercial API

- Only after separate redistribution/derived-data rights, tenant security, quotas, usage metering, support and legal terms are verified.
- External access remains disabled until a separate release decision.

### Acceptance checklist

- [ ] Exact source product and provider API documented.
- [ ] Written entitlement covers the exact dataset and use.
- [ ] No undocumented endpoints or scraping.
- [ ] Instrument and issuer identity are independently validated.
- [ ] Timestamp, period, timezone, currency, units and adjustment basis are explicit.
- [ ] Coverage and stale-data behavior are tested.
- [ ] Source revision and provenance survive caching and downstream calculations.
- [ ] Tenant-level permissions and quotas are enforced before public exposure.
- [ ] No strategy, backtest, holdout, production or trading-execution boundary is changed.

## 11. Non-negotiable safety invariants

- No NSE/BSE scraping, undocumented endpoints or unlicensed ingestion.
- No provider request while the access gate is `NOT_CONFIGURED`.
- No fabricated, guessed, silently converted or backfilled market/financial values.
- No assumed entitlement from a broker account, free API tier, successful HTTP response or public webpage.
- No purchases, subscriptions, account creation, credentials, agreements or activations without separate user approval.
- No raw or derived data redistribution without explicit contractual permission.
- No secrets in source control, logs or chat.
- No production deployment/settings/secrets/aliases changes.
- No live trading, real orders or automated signal-to-order path.
- No changes to frozen research/holdout architecture, candidate definitions, strategy parameters or backtest mathematics.
- Existing PR stacks remain open, draft and unmerged; this design branch is independent of those stacks.

**Bottom line:** Build and own the API layer now, but keep data ingestion disabled until a lawful, source-specific entitlement is proven. This lets StockSamjho own its contracts, quality controls and future commercial interface without pretending that the API itself creates a right to market data.
