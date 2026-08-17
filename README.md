# Compounder DNA — Live Data Build

This build keeps the existing UI and fixes the live data pipeline.

## Deployment
Upload the contents of this folder/repository to GitHub and let Vercel deploy the `main` branch.

## API
- `GET /api/health`
- `GET /api/analyze?symbol=TCS`
- `POST /api/analyze` accepts `{ "symbol": "TCS", "horizon": 20 }` and generates an AI explanation from the canonical backend analysis. Client-supplied financial metrics are not accepted as the AI source of truth.

## Data rules
- Yahoo Finance fundamentalsTimeSeries is consumed with provider result validation disabled because Yahoo can return valid `TYPE: ALL` / `periodType: TTM` rows that the installed yahoo-finance2 4.0.2 schema rejects.
- StockSamjho performs its own normalization and numeric validation.
- TTM is preserved and treated as verified when directly supplied.
- Historical CAGR calculations use annual/12M rows and exclude TTM from the baseline.
- Missing values are `null`; no missing financial metric is converted to zero.
- Non-finite values are sanitized to `null` before the API response is returned.
- Data confidence is based on actual field completeness and is included in the scoring.
- Frontend production analysis has no hardcoded stock-number fallback.

## Analysis methodology

The API follows: verified provider data → normalization → deterministic calculations → data-quality checks → score/decision → optional AI explanation. The current Compounder Score is `compounder-v1.0-heuristic` and is explicitly an initial model subject to backtesting; it is not presented as empirically validated.

Core metric definitions are exposed by the analysis API under `metricDefinitions`.
