# Phase 2 Technical Compatibility Contract

## Architecture

The active production data flow is:

`verified OHLCV -> canonical technical engine -> verified analysis -> consumer`

Where a legacy consumer still requires older semantics, the intentional compatibility path is:

`verified OHLCV -> canonical technical engine -> compatibility adapter -> legacy market-engine contract -> legacy consumer`

**Problem owner:** CTO / Principal Architect

## Consumer / provenance audit decision

The audit found one genuine active duplicate boundary: `/api/actionability` was invoking `lib/trading-engine.js`, which independently recalculated EMA/RSI/MACD/ATR/ADX/VWAP/relative-volume and rebuilt trade levels from raw rows. That path could diverge from canonical technical evidence and could discard canonical lifecycle/risk provenance.

The minimum correct fix was to remove that consumer dependency and pass `analysis.technical` directly into actionability. The legacy `lib/trading-engine.js` remains in the repository as historical/dead compatibility code; it is no longer an active production consumer of verified analysis.

Actionability now preserves the canonical technical provenance and breakout lifecycle risk evidence, including invalidation evidence and target evidence, instead of reconstructing those values from raw market rows.

## Trader Team decision

| Output / concern | Decision | Reason |
|---|---|---|
| SMA/EMA 20/50/200 | Canonical | Consumers must not recalculate these independently. |
| RSI14 | Canonical | Consumers must not recalculate or silently reinterpret the canonical value. |
| ATR14 | Canonical | Canonical risk evidence remains authoritative. |
| Relative volume / volumeSpike | Canonical | Missing volume remains unavailable; no consumer may manufacture confirmation. |
| Trend | Preserve legacy semantics only through explicit adapter | Legacy consumers depend on exact strings; canonical trend remains authoritative for new consumers. |
| Trend strength | Preserve legacy semantics only through explicit adapter | Legacy distance-from-SMA200 meaning must not be confused with canonical ADX. |
| Support / resistance | Canonical for new consumers; legacy 20-bar extrema only through explicit adapter | Avoid silent semantic replacement. |
| 52-week high/low | Preserve legacy qualification | Requires 252 usable rows in the compatibility contract. |
| Breakout/retest lifecycle | Canonical evidence only | Consumers must not reconstruct lifecycle state or promote `BREAKOUT_CONFIRMED`, `RETEST_PENDING`, or `RETEST_CONFIRMED` into stronger claims. |
| Risk / invalidation / R/R | Canonical risk evidence | Numeric invalidation must remain distinguishable from its evidence and target metadata. |
| Provenance | Preserve end-to-end | Symbol, source, observation timestamp, retrievedAt, timeframe, data quality and validation state must survive the consumer boundary. |

## Data-quality boundary

Canonical technical validation remains fail-closed. Missing or invalid OHLCV produces `UNAVAILABLE`; consumers must not coerce unavailable evidence to zero, neutral confirmation, fabricated targets, or fabricated R/R.

Compatibility adapters may transform field names or legacy semantics, but they must not create new evidence. The adapter records its compatibility semantics and carries canonical provenance alongside the transformed output.

## Risk-evidence boundary

The canonical breakout lifecycle remains the source of truth for technical risk evidence. Downstream consumers preserve `riskEvidence`, including:

- invalidation level and directional validation
- breakout level and retest evidence
- support/resistance evidence
- ATR at breakout
- target price and target provenance (`type`, `touches`, `strength`, `lastDate`)
- timeframe and provenance

A consumer may render or explain this evidence, but must not replace it with a separately calculated stop/target/R/R source of truth.

## No-look-ahead boundary

Consumers receive canonical lifecycle state and its provenance. They must not reconstruct historical breakout/retest states from later bars. Canonical `noLookAhead` evidence remains authoritative.

## Intentionally retained / deferred

1. Legacy compatibility calculations remain only where an identified legacy consumer contract requires them.
2. Historical/dead `lib/trading-engine.js` is retained for now rather than deleted blindly; no active production consumer may import it for canonical technical analysis.
3. Broader multi-timeframe architecture remains out of scope.
4. No new indicators, strategies, execution rules, broker integrations, or production BUY/SELL authority are introduced by this audit.

No production BUY/SELL authority was changed.
