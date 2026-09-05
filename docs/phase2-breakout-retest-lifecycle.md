# Phase 2 — Breakout / Retest / Failed Breakout Lifecycle

## Trader Team decision

**Problem Owner: Swing Trader.**

- Trading definitions: Swing Trader
- Intraday/timeframe semantics: Active Trader
- Invalidation and risk/reward: Trade & Risk Management Specialist
- Technical calculation: Principal Software Engineer / Quant responsibility
- Architecture: CTO / Principal Architect
- Evidence/provenance: Security / Data Reliability

### Agreed contract

1. A wick through a level is a breakout candidate, not confirmation.
2. Confirmation requires a close beyond a previously confirmed swing level on the same explicit timeframe.
3. Price confirmation and volume confirmation remain separate evidence. Existing relative-volume confirmation of `>= 1.2` is retained; low volume is `LOW`, not automatic failure.
4. Missing volume is `UNAVAILABLE` and cannot be treated as confirmation.
5. A retest is a later return into a volatility-aware zone around the broken level. A touch alone is insufficient; holding the breakout side confirms the retest.
6. A close back across the breakout level before a successful hold is `FAILED`; after a retest it is `FAILED_RETEST`.
7. A breakout inside the retest window without a retest is `PENDING_RETEST`; after the window it remains `CONFIRMED` with `NO_RETEST_OBSERVED`.
8. A successful retest followed by a move beyond the breakout candle extreme is `CONTINUATION`.
9. Former resistance/support becomes role-flipped only after retest hold evidence.
10. Invalidation is evaluated before reward. Without defensible invalidation, risk/reward remains unavailable.
11. Targets come from canonical reaction zones only; no synthetic target is invented.
12. Historical events are observation-time based. Pivot confirmation uses completed bars only, so future candles cannot retroactively create an earlier breakout.

## Horizon policy

One canonical lifecycle is used. Daily is the first-class implementation timeframe. Shorter/intraday consumers must pass an explicit timeframe and must never relabel daily evidence as intraday. No separate algorithms are introduced unless later evidence proves a semantic difference that cannot be represented by explicit timeframe context.

## Analysis-only safety boundary

The lifecycle is technical evidence only. It does not modify production BUY/SELL authority, decision-evidence-gate, predictive research, candidate definitions, strategy validation, holdout logic, validation thresholds, or trading cost/slippage assumptions.
