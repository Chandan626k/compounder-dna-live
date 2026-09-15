# Phase 2.0 — Frozen Phase 1 Baseline Integration

## Baseline

Phase 2 working branch: `phase2/frozen-phase1-integration`
Frozen Phase 1 HEAD: `9741f373860ee44903cf804f504df2bb17f4d4d7`
Original Phase 2 candidate: `f7215b2f3ef7ec4a8a21ab4699d138310dc86008`
Common ancestor: `49a78cabe5b42c8202c86328447cb9fb0aec0170`

The working branch is created directly from the frozen Phase 1 HEAD. The original Phase 2 candidate branch is preserved unchanged.

## Reapplied Phase 2 scope

Safely reapplied as additive, isolated work:

- canonical reaction support/resistance
- canonical market structure
- canonical breakout/retest lifecycle
- canonical technical evidence engine
- canonical-to-legacy technical compatibility adapter
- focused regression tests
- additive Phase 2 test entrypoint and exact-head validation workflow

No Phase 1 financial, monetary, valuation, provider, or production-action implementation was transplanted.

## Held/rejected candidate scope

The following candidate changes are intentionally not transplanted in Phase 2.0:

- `lib/market-engine.js` and related financial/valuation changes — overlaps frozen Phase 1 authority.
- `lib/statement-evidence.js` monetary changes — frozen Phase 1 authority.
- `lib/market-data-provider.js` changes — not required for breakout baseline and requires separate provider-contract review.
- API/frontend rewrites — deferred until canonical evidence is runtime-verified.
- bank IR and PDF evidence additions — deferred to a separate evidence-authority workstream.
- candidate remediation workflow — replaced by a branch-specific Phase 2 validation workflow.

## Breakout lifecycle findings

The historical lifecycle implementation initially treated a zone touch as `SUCCESSFUL_RETEST`. That violated the agreed contract that a touch is only a retest attempt and a later hold is required for confirmation.

The candidate history subsequently changed this to:

`BREAKOUT_CONFIRMED -> RETEST_PENDING -> SUCCESSFUL_RETEST -> CONTINUATION`

with explicit `FAILED` and `FAILED_RETEST` states. Risk evidence was also hardened so invalidation must be directionally defensible and reward uses the nearest eligible reaction target.

The Phase 2.0 regression suite explicitly locks the numeric retest extreme (`102`) and its type, so a boolean or other semantic substitution cannot silently pass.

## Safety boundary

This Phase 2.0 line does not alter:

- EV/currency semantics
- provider monetary evidence
- P/E/EPS fair value
- Phase 1 evidence authority
- production BUY/SELL gate
- broker execution
