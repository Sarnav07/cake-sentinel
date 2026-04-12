/**
 * Analyzes an array of recent prices (e.g. from the last N blocks) 
 * to categorize the current market regime.
 * 
 * @param prices Array of historical prices ordered from oldest to newest.
 */
export function detectRegime(prices: number[]): 'trending' | 'mean_reverting' | 'high_vol' | 'unknown' {
  if (!prices || prices.length < 5) return 'unknown';

  let maxPrice = prices[0];
  let minPrice = prices[0];
  let sumReturns = 0;
  let sumSquaredReturns = 0;

  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1];
    const curr = prices[i];
    
    if (curr > maxPrice) maxPrice = curr;
    if (curr < minPrice) minPrice = curr;

    const ret = (curr - prev) / prev;
    sumReturns += ret;
  }

  // Calculate standard deviation of returns (Volatility)
  const meanReturn = sumReturns / (prices.length - 1);
  for (let i = 1; i < prices.length; i++) {
    const ret = (prices[i] - prices[i - 1]) / prices[i - 1];
    sumSquaredReturns += Math.pow(ret - meanReturn, 2);
  }
  const variance = sumSquaredReturns / (prices.length - 1);
  const volatility = Math.sqrt(variance);

  // Price Momentum (Overall price change from start to end)
  const absoluteMomentum = Math.abs((prices[prices.length - 1] - prices[0]) / prices[0]);

  // Arbitrary simple heuristic thresholds for Hackathon Demo:
  const HIGH_VOL_THRESHOLD = 0.05; // 5% vol per period
  const TRENDING_THRESHOLD = 0.03; // 3% momentum move

  if (volatility > HIGH_VOL_THRESHOLD) {
    return 'high_vol';
  } else if (absoluteMomentum > TRENDING_THRESHOLD) {
    return 'trending';
  } else {
    return 'mean_reverting'; // Low momentum & low vol suggests ranging market
  }
}
