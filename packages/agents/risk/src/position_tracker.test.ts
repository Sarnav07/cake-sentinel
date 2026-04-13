import { describe, expect, it } from 'vitest';
import { PositionTracker } from './position_tracker';

describe('PositionTracker', () => {
  it('records trades and tracks capital deployment', () => {
    const tracker = new PositionTracker();
    tracker.recordTrade({
      txHash: '0x1',
      signalId: 'sig-1',
      strategyId: 'arb',
      poolAddress: '0xpool',
      pair: 'BNB/USDT',
      direction: 'buy',
      sizeUSD: 100,
      entryPrice: 1,
      exitPrice: 1.1,
      grossProfitUSD: 10,
      feesUSD: 1,
      gasUsedUSD: 1,
      netProfitUSD: 8,
      regime: 'trending',
      timestamp: Date.now(),
    });

    expect(tracker.positionCount).toBe(1);
    expect(tracker.getTotalCapitalDeployed()).toBe(100);
    expect(tracker.getPositionPairAllocation('BNB/USDT')).toBe(100);
  });

  it('detects max position count', () => {
    const tracker = new PositionTracker();
    for (let index = 0; index < 5; index += 1) {
      tracker.recordTrade({
        txHash: `0x${index}`,
        signalId: `sig-${index}`,
        strategyId: 'arb',
        poolAddress: '0xpool',
        pair: 'BNB/USDT',
        direction: 'buy',
        sizeUSD: 10,
        entryPrice: 1,
        exitPrice: 1.1,
        grossProfitUSD: 1,
        feesUSD: 0.1,
        gasUsedUSD: 0.1,
        netProfitUSD: 0.8,
        regime: 'trending',
        timestamp: Date.now(),
      });
    }

    expect(tracker.exceedsMaxPositionCount(5)).toBe(true);
  });
});