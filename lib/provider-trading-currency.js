/**
 * Preserve only an explicitly supplied provider trading-currency value.
 * Missing currency must stay unknown; listing symbols/exchanges are not a currency source.
 * The provider's original denomination spelling is retained (for example, GBp).
 */
export function providerTradingCurrency(value) {
  if (typeof value !== 'string') return null;
  const currency = value.trim();
  return currency || null;
}
