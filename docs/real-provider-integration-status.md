# Real NSE/BSE Provider Integration Status

## Current state

- NSE reporting adapter boundary: ready for provider-specific transport.
- BSE reporting adapter boundary: ready for provider-specific transport.
- NSE/BSE calendar boundaries remain separate from filing boundaries.
- Transport contract is provider-neutral and requires an injected request implementation.
- Default adapter access mode remains `DEVELOPMENT_FIXTURE`.
- Production authority remains disabled.
- Credential configuration stores references, not credential values.
- Real NSE/BSE authenticated runtime is intentionally disabled until legitimate provider entitlement and transport documentation are supplied.

## Integration sequence

1. Supply the legitimate provider credential reference and verified feed documentation.
2. Implement only the provider-specific authenticated transport behind the existing adapter.
3. Capture the raw response before normalization.
4. Create an immutable snapshot with source identity, publication/effective/retrieval timestamps, content hash, and revision relationship.
5. Normalize into the canonical provider-neutral record.
6. Validate identity, semantics, provenance, and historical validity.
7. Prove historical replay behavior against the evaluation cutoff.
8. Run targeted, module, full regression, and CI against the exact final commit.
9. Keep production authority off until independent production-authority proof is complete.

No live NSE/BSE endpoint, credential, or entitlement is fabricated by this repository.
