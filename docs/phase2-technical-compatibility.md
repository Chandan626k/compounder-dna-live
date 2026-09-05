# Phase 2 Technical Compatibility Contract

## Architecture

`verified OHLCV -> canonical technical engine -> compatibility adapter -> legacy technical() contract -> existing consumers`

**Problem owner:** CTO / Principal Architect

## Trader Team decision

| Output / concern | Decision | Reason |
|---|---|---|
| SMA/EMA 20/50/200 | Canonical | Same calculation and trading meaning as legacy output. |
| RSI14 | Canonical | Same Wilder-style calculation and meaning. |
| ATR14 | Canonical | Same Wilder ATR calculation and meaning. |
| Relative volume / volumeSpike | Canonical | Same latest-volume / 20D-average meaning. |
| Trend | Preserve legacy semantics | Existing scoring/actionability consume exact strings; canonical `SIDEWAYS / TRANSITION` is not equivalent to legacy `RECOVERING / MIXED`. |
| Trend strength | Preserve legacy semantics | Legacy field means absolute distance from SMA200; canonical ADX is a fundamentally different metric. ADX is exposed separately in `canonicalEvidence`. |
| Support / resistance | Preserve legacy semantics | Legacy values are last-20 usable-bar extrema. Canonical levels use a broader level set and must not silently change trading/scoring behavior. |
| 52-week high/low | Preserve legacy qualification | Requires 252 usable rows; values remain null before that threshold. |
| Change 1D/20D/3M/6M/1Y | Canonical | Same lookback semantics; no future data is introduced. |
| Drawdown / range position | Compatibility adapter | Derived from the legacy-qualified 52-week levels. |
| Volume trend | Compatibility adapter | Legacy-only comparison of current 20D average vs previous 20D average; no canonical equivalent existed. |
| Breakout/breakdown | Canonical evidence only | New canonical structure is not substituted into legacy fields. It is exposed through `canonicalEvidence` and remains analysis evidence, not a legacy semantic replacement. |
| ADX/MACD/Bollinger/structure/setup/confidence | Canonical evidence only | New meanings are not mapped onto legacy fields with similar names. |

## Data-quality boundary

The adapter keeps the legacy usable-row selection for compatibility (`close/high/low/volume` finite), then requires those rows to pass canonical OHLCV validation. Missing/invalid OHLCV therefore fails closed rather than fabricating values. This is an intentional data-quality improvement and does not change valid legacy outputs.

The market-engine chart normalizer now carries `open` and a single retrieval timestamp so canonical validation can operate on verified OHLCV and provenance can preserve freshness context.

## Provenance

Every compatibility result contains canonical provenance including symbol, source, retrieval timestamp when available, observation timestamp, timeframe, data-quality status, and validation reason. The adapter also records the exact compatibility semantics used.

## Intentionally deferred

These are later Phase-2 improvements, not part of the compatibility migration:

1. Reaction-based support/resistance zones.
2. More granular market-structure state machine.
3. Breakout/retest/failed-breakout lifecycle.
4. Analysis-only entry/invalidation/target/risk-reward evidence.
5. Broader multi-timeframe architecture.
6. Removal/migration of legacy `atr`/`rsi` utility exports if any external contract requires them.

No strategy parameters, candidate definitions, backtest mathematics, costs/slippage, holdout protocol, or production BUY/SELL authority are changed by this adapter.
