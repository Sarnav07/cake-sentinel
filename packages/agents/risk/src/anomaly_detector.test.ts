import { describe, expect, it } from 'vitest';
import { detectAnomaly } from './anomaly_detector';

const baseState = {
  timestamp: Date.now(),
  gasPriceGwei: 2,
  regime: 'trending' as const,
  pools: {
    pool: {
      address: '0x1',
      token0: { address: '0x2', symbol: 'BNB', decimals: 18 },
      token1: { address: '0x3', symbol: 'USDT', decimals: 6 },
      reserve0: '100',
      reserve1: '100',
      feeTier: 2500,
      liquidity: '1000',
      volumeUSD: '1000',
    },
  },
};

describe('detectAnomaly', () => {
  it('detects stale data', () => {
    const result = detectAnomaly({ ...baseState, timestamp: Date.now() - 31_000 });
    expect(result.isAnomalous).toBe(true);
  });

  it('detects flash crash', () => {
    const previous = baseState;
    const current = { ...baseState, pools: { pool: { ...baseState.pools.pool, reserve1: '70' } } };
    const result = detectAnomaly(current, previous);
    expect(result.isAnomalous).toBe(true);
    expect(result.reason).toBe('flash_crash_detected');
  });

  it('detects depeg', () => {
    const current = { ...baseState, pools: { pool: { ...baseState.pools.pool, reserve0: '100', reserve1: '200' } } };
    const result = detectAnomaly(current, baseState);
    expect(result.isAnomalous).toBe(true);
  });
});