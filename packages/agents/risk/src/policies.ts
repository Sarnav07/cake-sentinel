export interface RiskPolicy {
  maxPositionSizeUSD: number;
  maxOpenPositions: number;
  stopLossPct: number;
  maxDrawdownPct: number;
  maxGasCostUSD: number;
  minExpectedProfitUSD: number;
  maxSlippageBps: number;
  oracleDeviationThreshold: number;
}

export const DEFAULT_POLICY: RiskPolicy = {
  maxPositionSizeUSD: 500,
  maxOpenPositions: 5,
  stopLossPct: 5,
  maxDrawdownPct: 10,
  maxGasCostUSD: 15,
  minExpectedProfitUSD: 2,
  maxSlippageBps: 50,
  oracleDeviationThreshold: 5,
};