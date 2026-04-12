export interface PoolData {
  address: string;
  token0: {
    address: string;
    symbol: string;
    decimals: number;
  };
  token1: {
    address: string;
    symbol: string;
    decimals: number;
  };
  reserve0: string;
  reserve1: string;
  feeTier: number;
  liquidity: string;
  volumeUSD: string;
}

export interface MarketState {
  timestamp: number;
  pools: Record<string, PoolData>;
  regime: 'trending' | 'mean_reverting' | 'high_vol' | 'unknown';
  gasPriceGwei: number;
}

export interface TradeSignal {
  id: string;
  strategyId: string;
  poolAddress: string;
  direction: 'buy' | 'sell';
  targetToken: string;
  sizeUSD: number;
  expectedProfitUSD: number;
  confidence: number;
  timestamp: number;
}

export interface RiskDecision {
  signalId: string;
  approved: boolean;
  reason?: string;
  maxSlippageBps?: number;
  deadlineSeconds?: number;
}

export interface TradeEvent {
  txHash: string;
  signalId: string;
  poolAddress: string;
  direction: 'buy' | 'sell';
  sizeUSD: number;
  entryPrice: number;
  gasUsedUSD: number;
  netProfitUSD: number;
  timestamp: number;
}
