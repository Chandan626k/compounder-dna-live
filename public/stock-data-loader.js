(() => {
  const errorMessage = (error) => error?.message || String(error || 'Request failed.');

  async function fetchJson(fetchImpl, url) {
    let response;
    try {
      response = await fetchImpl(url, { headers: { Accept: 'application/json' } });
    } catch (error) {
      throw new Error(`${url} request failed: ${errorMessage(error)}`);
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error(`${url} returned HTTP ${response.status} with invalid JSON.`);
    }
    if (!response.ok) {
      throw new Error(payload?.error || `${url} returned HTTP ${response.status}.`);
    }
    if (payload?.success === false && payload?.error) {
      throw new Error(payload.error);
    }
    return payload;
  }

  async function loadStockData(symbol, fetchImpl = window.fetch?.bind(window)) {
    const normalizedSymbol = String(symbol ?? '').trim().toUpperCase();
    if (!normalizedSymbol) throw new Error('Stock symbol is required.');
    if (typeof fetchImpl !== 'function') throw new Error('Browser fetch is unavailable.');

    const query = encodeURIComponent(normalizedSymbol);
    const [analysisResult, tradingResult] = await Promise.allSettled([
      fetchJson(fetchImpl, `/api/analyze?symbol=${query}`),
      fetchJson(fetchImpl, `/api/trading?symbol=${query}`),
    ]);

    if (analysisResult.status !== 'fulfilled') {
      throw new Error(`Analysis data unavailable: ${errorMessage(analysisResult.reason)}`);
    }

    return {
      analysis: analysisResult.value,
      trading: tradingResult.status === 'fulfilled' ? tradingResult.value : null,
      tradingError: tradingResult.status === 'rejected' ? errorMessage(tradingResult.reason) : null,
    };
  }

  window.StockSamjhoStockDataLoader = Object.freeze({ loadStockData });
})();
