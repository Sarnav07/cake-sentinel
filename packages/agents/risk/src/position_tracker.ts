import { TradeEvent } from '@pancakeswap-agent/core';

export interface OpenPosition {
  sizeUSD: number;
  entryPrice: number;
  timestamp: number;
  pair: string;
  poolAddress: string;
  strategyId: string;
  regime: string;
}

export class PositionTracker {
  private readonly positions = new Map<string, OpenPosition>();
  private readonly capitalByToken = new Map<string, number>();
  private totalCapitalDeployedUSD = 0;

  public recordTrade(trade: TradeEvent): void {
    this.positions.set(trade.signalId, {
      sizeUSD: trade.sizeUSD,
      entryPrice: trade.entryPrice,
      timestamp: trade.timestamp,
      pair: trade.pair,
      poolAddress: trade.poolAddress,
      strategyId: trade.strategyId,
      regime: trade.regime,
    });
    this.totalCapitalDeployedUSD += trade.sizeUSD;
    this.capitalByToken.set(trade.pair, (this.capitalByToken.get(trade.pair) ?? 0) + trade.sizeUSD);
  }

  public get positionCount(): number {
    return this.positions.size;
  }

  public getTotalCapitalDeployed(): number {
    return this.totalCapitalDeployedUSD;
  }

  public getCapitalByToken(): Map<string, number> {
    return new Map(this.capitalByToken);
  }

  public exceedsMaxPositionCount(maxOpenPositions: number): boolean {
    return this.positionCount >= maxOpenPositions;
  }

  public getPositionPairAllocation(pair: string): number {
    return this.capitalByToken.get(pair) ?? 0;
  }

  public getOpenPositions(): OpenPosition[] {
    return Array.from(this.positions.values());
  }

  public evaluateStopLoss(
    getCurrentPrice: (position: OpenPosition) => number,
    stopLossPct: number,
  ): OpenPosition[] {
    const triggered: OpenPosition[] = [];

    for (const position of this.positions.values()) {
      const currentPrice = getCurrentPrice(position);
      const stopLossPrice = position.entryPrice * (1 - stopLossPct / 100);
      if (currentPrice > 0 && currentPrice <= stopLossPrice) {
        triggered.push(position);
      }
    }

    return triggered;
  }
}