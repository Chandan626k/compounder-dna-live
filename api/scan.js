import { analyze as analyzeStock } from '../lib/market-engine.js';

const SYMBOLS = [
  'TCS','INFY','HCLTECH','WIPRO','RELIANCE','ITC','HDFCBANK','ICICIBANK',
  'SBIN','AXISBANK','KOTAKBANK','LT','BHARTIARTL','MARUTI','M&M','SUNPHARMA',
  'TITAN','ASIANPAINT','ULTRACEMCO','NESTLEIND','HINDUNILVR','BAJFINANCE'
];

const num = v => typeof v === 'number' && Number.isFinite(v) ? v : null;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success:false, error:'Method not allowed' });
  try {
    const settled = await Promise.allSettled(SYMBOLS.map(s => analyzeStock(s)));
    const results = settled.map((x, i) => {
      if (x.status !== 'fulfilled') return null;
      const d = x.value || {};
      const score = d.score || {};
      const v = d.valuation || {};
      const t = d.technical || {};
      const stock = d.stock || {};
      return {
        symbol: stock.symbol || SYMBOLS[i],
        name: stock.name || SYMBOLS[i],
        price: num(stock.price),
        score: num(score.overall),
        risk: num(score.risk),
        valuation: v.verdict || 'DATA INSUFFICIENT',
        trend: t.trend || 'Not Available',
        action: d.decision?.action || 'WAIT',
        confidence: num(d.dataQuality?.confidence),
        dataLimited: Boolean(d.dataQuality?.dataLimited),
      };
    }).filter(Boolean).sort((a,b) => (b.score ?? -1) - (a.score ?? -1));

    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      count: results.length,
      requested: SYMBOLS.length,
      results,
      note: 'Radar ranks the same deterministic StockSamjho engine; unavailable metrics are not fabricated.'
    });
  } catch (error) {
    console.error('[SCAN ERROR]', error?.message);
    return res.status(502).json({ success:false, error:'Opportunity Radar is temporarily unavailable.' });
  }
}
