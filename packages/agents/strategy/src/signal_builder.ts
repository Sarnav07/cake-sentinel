import { MarketState, TradeSignal } from '@pancakeswap-agent/core';
import { randomUUID } from 'crypto';
import { ArbitrageOpportunity } from './arbitrage_detector';

function getPositionSizeUSD(regime: MarketState['regime']): number {
  if (regime === 'mean_reverting') {
    return 300;
  }

  if (regime === 'high_vol') {
    return 50;
  }

  return 100;
}

export function buildTradeSignal(
  opportunity: ArbitrageOpportunity,
  regime: MarketState['regime'],
  strategyId: string,
): TradeSignal {
  const sizeUSD = getPositionSizeUSD(regime);
  const normalizedConfidence = Math.min(0.95, opportunity.discrepancyPct / 5);
  const confidence = Math.max(0, normalizedConfidence);

  return {
    id: randomUUID(),
    strategyId,
    poolAddress: opportunity.poolA.address,
    direction: opportunity.direction,
    targetToken: opportunity.token,
    sizeUSD,
    expectedProfitUSD: opportunity.estimatedProfitUSD,
    confidence,
    timestamp: Date.now(),
  };
}
