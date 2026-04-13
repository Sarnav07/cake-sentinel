import { describe, expect, it } from 'vitest';
import { detectArbitrageOpportunities } from './arbitrage_detector';
import { buildTradeSignal } from './signal_builder';

const poolA = {
  address: '0xa',
  token0: { address: '0x1', symbol: 'BNB', decimals: 18 },
  token1: { address: '0x2', symbol: 'USDT', decimals: 6 },
  reserve0: '100',
  reserve1: '30000',
  feeTier: 2500,
  liquidity: '100000',
  volumeUSD: '1000',
};

const poolB = {
  address: '0xb',
  token0: { address: '0x1', symbol: 'BNB', decimals: 18 },
  token1: { address: '0x2', symbol: 'USDT', decimals: 6 },
  reserve0: '100',
  reserve1: '33000',
  feeTier: 2500,
  liquidity: '100000',
  volumeUSD: '1000',
};

describe('arbitrage detector', () => {
  it('finds opportunities for pool discrepancies', () => {
    const opportunities = detectArbitrageOpportunities({ a: poolA, b: poolB }, 2, 0.5);
    expect(opportunities.length).toBeGreaterThan(0);
  });

  it('sorts best opportunity first', () => {
    const opportunities = detectArbitrageOpportunities({ a: poolA, b: poolB }, 2, 0.5);
    expect(opportunities[0].estimatedProfitUSD).toBeGreaterThanOrEqual(opportunities.at(-1)?.estimatedProfitUSD ?? 0);
  });

  it('builds a trade signal with bounded confidence', () => {
    const opportunity = detectArbitrageOpportunities({ a: poolA, b: poolB }, 2, 0.5)[0];
    const signal = buildTradeSignal(opportunity, 'trending', 'arb-v1');
    expect(signal.strategyId).toBe('arb-v1');
    expect(signal.confidence).toBeGreaterThanOrEqual(0);
    expect(signal.confidence).toBeLessThanOrEqual(0.95);
  });
});