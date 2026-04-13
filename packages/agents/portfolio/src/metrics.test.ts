import { describe, expect, it } from 'vitest';
import { calculatePortfolioMetrics } from './metrics';

const baseTrades = [
  { txHash: '0x1', signalId: '1', strategyId: 'arb', pair: 'BNB/USDT', direction: 'buy' as const, sizeUSD: 100, entryPrice: 1, exitPrice: 1.1, grossProfitUSD: 10, gasUsedUSD: 1, feesUSD: 0.5, netProfitUSD: 8.5, timestamp: 1_700_000_000_000, regime: 'trending', poolAddress: '0xpool' },
  { txHash: '0x2', signalId: '2', strategyId: 'arb', pair: 'BNB/USDT', direction: 'buy' as const, sizeUSD: 100, entryPrice: 1, exitPrice: 0.9, grossProfitUSD: -8, gasUsedUSD: 1, feesUSD: 0.5, netProfitUSD: -9.5, timestamp: 1_700_086_400_000, regime: 'mean_reverting', poolAddress: '0xpool' },
  { txHash: '0x3', signalId: '3', strategyId: 'trend', pair: 'CAKE/WBNB', direction: 'sell' as const, sizeUSD: 50, entryPrice: 2, exitPrice: 2.2, grossProfitUSD: 12, gasUsedUSD: 0.5, feesUSD: 0.2, netProfitUSD: 11.3, timestamp: 1_700_172_800_000, regime: 'high_vol', poolAddress: '0xpool' },
];

describe('portfolio metrics', () => {
  it('calculates win rate', () => {
    const metrics = calculatePortfolioMetrics(baseTrades);
    expect(metrics.winRate).toBeCloseTo((2 / 3) * 100, 3);
  });

  it('calculates total return', () => {
    const metrics = calculatePortfolioMetrics(baseTrades);
    expect(metrics.totalReturnUSD).toBeCloseTo(10.3, 3);
  });

  it('calculates gross profit and gas', () => {
    const metrics = calculatePortfolioMetrics(baseTrades);
    expect(metrics.grossProfitUSD).toBeCloseTo(14, 3);
    expect(metrics.totalGasPaidUSD).toBeCloseTo(2.5, 3);
  });

  it('calculates average profit per trade', () => {
    const metrics = calculatePortfolioMetrics(baseTrades);
    expect(metrics.avgProfitPerTrade).toBeCloseTo(10.3 / 3, 3);
  });

  it('calculates gas efficiency', () => {
    const metrics = calculatePortfolioMetrics(baseTrades);
    expect(metrics.gasEfficiency).toBeCloseTo(10.3 / 2.5, 3);
  });

  it('builds strategy breakdown', () => {
    const metrics = calculatePortfolioMetrics(baseTrades);
    expect(metrics.strategyBreakdown.arb.tradeCount).toBe(2);
    expect(metrics.strategyBreakdown.trend.tradeCount).toBe(1);
  });

  it('builds regime breakdown', () => {
    const metrics = calculatePortfolioMetrics(baseTrades);
    expect(metrics.regimeBreakdown.trending.tradeCount).toBe(1);
    expect(metrics.regimeBreakdown['mean_reverting'].tradeCount).toBe(1);
  });

  it('computes sharpe ratio from daily returns', () => {
    const metrics = calculatePortfolioMetrics(baseTrades);
    expect(Number.isFinite(metrics.sharpeRatio)).toBe(true);
  });

  it('computes max drawdown', () => {
    const metrics = calculatePortfolioMetrics(baseTrades);
    expect(metrics.maxDrawdownPct).toBeGreaterThanOrEqual(0);
  });

  it('handles empty trades', () => {
    const metrics = calculatePortfolioMetrics([]);
    expect(metrics.totalTrades).toBe(0);
    expect(metrics.equityCurve).toEqual([]);
  });
});