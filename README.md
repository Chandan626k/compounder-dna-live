# Compounder DNA — Live Data Build

This build keeps the existing UI and fixes the live data pipeline.

## Deployment
Upload the contents of this folder/repository to GitHub and let Vercel deploy the `main` branch.

## API
- `GET /api/health`
- `GET /api/analyze?symbol=TCS`
- `POST /api/analyze` remains the existing optional AI narrative contract.

## Data rules
- Yahoo Finance fundamentalsTimeSeries is consumed with provider result validation disabled because Yahoo can return valid `TYPE: ALL` / `periodType: TTM` rows that the installed yahoo-finance2 4.0.2 schema rejects.
- StockSamjho performs its own normalization and numeric validation.
- TTM is preserved and treated as verified when directly supplied.
- Historical CAGR calculations use annual/12M rows and exclude TTM from the baseline.
- Missing values are `null`; no missing financial metric is converted to zero.
- Non-finite values are sanitized to `null` before the API response is returned.
- Data confidence is based on actual field completeness and is included in the scoring.
- Frontend production analysis has no hardcoded stock-number fallback.
