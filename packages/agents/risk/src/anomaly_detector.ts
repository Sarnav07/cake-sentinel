import { MarketState } from '@pancakeswap-agent/core';

export interface AnomalyResult {
  isAnomalous: boolean;
  reason: string | null;
  severity: 'low' | 'medium' | 'high';
}

export function detectAnomaly(currentState: MarketState, previousState?: MarketState): AnomalyResult {
  if (Date.now() - currentState.timestamp > 30_000) {
    return { isAnomalous: true, reason: 'stale_market_state', severity: 'high' };
  }

  if (!previousState) {
    return { isAnomalous: false, reason: null, severity: 'low' };
  }

  const currentPool = Object.values(currentState.pools)[0];
  const previousPool = Object.values(previousState.pools)[0];

  if (!currentPool || !previousPool) {
    return { isAnomalous: false, reason: null, severity: 'low' };
  }

  const currentPrice = Number(currentPool.reserve1) / Math.max(Number(currentPool.reserve0), 1);
  const previousPrice = Number(previousPool.reserve1) / Math.max(Number(previousPool.reserve0), 1);

  if (previousPrice > 0) {
    const dropPct = ((previousPrice - currentPrice) / previousPrice) * 100;
    if (dropPct >= 15) {
      return { isAnomalous: true, reason: 'flash_crash_detected', severity: 'high' };
    }
  }

  if (currentPool.token0.symbol.includes('USD') || currentPool.token1.symbol.includes('USD')) {
    const stablePrice = currentPrice;
    if (Math.abs(stablePrice - 1) > 0.005) {
      return { isAnomalous: true, reason: 'stablecoin_depeg_detected', severity: 'medium' };
    }
  }

  return { isAnomalous: false, reason: null, severity: 'low' };
}