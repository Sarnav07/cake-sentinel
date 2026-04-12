import { PoolData } from '@pancakeswap-agent/core';

export interface ArbitrageOpportunity {
  poolA: PoolData;
  poolB: PoolData;
  token: string;
  priceA: number;
  priceB: number;
  discrepancyPct: number;
  direction: 'buy' | 'sell';
  estimatedProfitUSD: number;
}

const DEFAULT_TRADE_SIZE_USD = 100;

function safeParseNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPoolPrice(pool: PoolData): number {
  const reserve0 = safeParseNumber(pool.reserve0);
  const reserve1 = safeParseNumber(pool.reserve1);

  if (reserve0 > 0 && reserve1 > 0) {
    return reserve1 / reserve0;
  }

  const liquidityProxy = safeParseNumber(pool.liquidity);
  return liquidityProxy > 0 ? liquidityProxy : 0;
}

function getSharedToken(poolA: PoolData, poolB: PoolData): string | null {
  const tokensA = [poolA.token0.address, poolA.token1.address];
  const tokensB = new Set([poolB.token0.address, poolB.token1.address]);

  for (const token of tokensA) {
    if (tokensB.has(token)) {
      return token;
    }
  }

  return null;
}

export function detectArbitrageOpportunities(
  pools: Record<string, PoolData>,
  gasPriceGwei: number,
  minDiscrepancyPct: number = 0.5,
): ArbitrageOpportunity[] {
  const poolList = Object.values(pools);
  const opportunities: ArbitrageOpportunity[] = [];
  const gasCostUSD = gasPriceGwei * 200_000 * 1e-9 * 300;

  for (let i = 0; i < poolList.length; i += 1) {
    for (let j = i + 1; j < poolList.length; j += 1) {
      const poolA = poolList[i];
      const poolB = poolList[j];
      const sharedToken = getSharedToken(poolA, poolB);

      if (!sharedToken) {
        continue;
      }

      const priceA = getPoolPrice(poolA);
      const priceB = getPoolPrice(poolB);

      if (priceA <= 0 || priceB <= 0) {
        continue;
      }

      const discrepancyPct = (Math.abs(priceA - priceB) / Math.min(priceA, priceB)) * 100;

      if (discrepancyPct < minDiscrepancyPct) {
        continue;
      }

      const estimatedProfitUSD = (discrepancyPct / 100) * DEFAULT_TRADE_SIZE_USD - gasCostUSD;
      const direction: 'buy' | 'sell' = priceA < priceB ? 'buy' : 'sell';

      opportunities.push({
        poolA,
        poolB,
        token: sharedToken,
        priceA,
        priceB,
        discrepancyPct,
        direction,
        estimatedProfitUSD,
      });
    }
  }

  return opportunities.sort((a, b) => b.estimatedProfitUSD - a.estimatedProfitUSD);
}
