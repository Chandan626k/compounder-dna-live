COMPOUNDER DNA - LIVE DATA FIX

Replace these files in the existing repository:
  lib/market-engine.js
  api/analyze.js
  package.json

No frontend/UI file is changed.

The fix:
- yahoo-finance2 fundamentalsTimeSeries uses validateResult:false only for annual/trailing requests because Yahoo currently returns valid ALL/TTM rows rejected by the library schema.
- Application-level normalization accepts TTM as verified data.
- Missing values remain null.
- Calculated values are deterministic.
- Confidence is based on data completeness.
- GET /api/analyze?symbol=TCS returns the stable StockSamjho analysis contract.
- POST /api/analyze preserves the existing AI narrative contract.

Before production deployment, run:
  npm install
  node --check lib/market-engine.js
  node --check api/analyze.js
