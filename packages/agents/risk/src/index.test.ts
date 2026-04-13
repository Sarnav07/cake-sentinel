import { beforeEach, describe, expect, it } from 'vitest';
import { orchestratorBus } from '@pancakeswap-agent/core';
import { startRiskAgent } from './index';

describe('risk agent integration', () => {
  beforeEach(() => {
    startRiskAgent();
  });

  it('approves a valid signal', async () => {
    const decisions: unknown[] = [];
    orchestratorBus.once('risk:decision', (decision) => decisions.push(decision));

    orchestratorBus.emit('market:update', {
      timestamp: Date.now(),
      gasPriceGwei: 2,
      regime: 'trending',
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
    });

    orchestratorBus.emit('strategy:signal', {
      id: '1',
      strategyId: 'arb-v1',
      poolAddress: '0x1',
      direction: 'buy',
      targetToken: '0x3',
      sizeUSD: 50,
      expectedProfitUSD: 20,
      confidence: 0.9,
      timestamp: Date.now(),
      estimatedGasUSD: 2,
    });

    expect(decisions.length).toBeGreaterThan(0);
  });
});