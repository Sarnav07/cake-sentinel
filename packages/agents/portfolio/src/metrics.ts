import { TradeRecord } from './trade_ledger';

export interface StrategyMetrics {
  winRate: number;
  totalReturnUSD: number;
  tradeCount: number;
  avgProfit: number;
}

export interface PortfolioMetrics {
  totalTrades: number;
  winRate: number;
  totalReturnUSD: number;
  grossProfitUSD: number;
  totalGasPaidUSD: number;
  netProfitUSD: number;
  avgProfitPerTrade: number;
  gasEfficiency: number;
  sharpeRatio: number;
  maxDrawdownPct: number;
  rolling24hPnL: number;
  rolling1hPnL: number;
  strategyBreakdown: Record<string, StrategyMetrics>;
  regimeBreakdown: Record<string, StrategyMetrics>;
  equityCurve: Array<{ timestamp: number; equity: number }>;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const average = mean(values);
  const variance = mean(values.map((value) => (value - average) ** 2));
  return Math.sqrt(variance);
}

function groupDailyReturns(trades: TradeRecord[]): number[] {
  const byDay = new Map<string, number>();
  for (const trade of trades) {
    const day = new Date(trade.timestamp).toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + trade.netProfitUSD);
  }
  return Array.from(byDay.values());
}

function buildBreakdown(trades: TradeRecord[], keySelector: (trade: TradeRecord) => string): Record<string, StrategyMetrics> {
  const grouped = new Map<string, TradeRecord[]>();
  for (const trade of trades) {
    const key = keySelector(trade);
    const bucket = grouped.get(key) ?? [];
    bucket.push(trade);
    grouped.set(key, bucket);
  }

  const breakdown: Record<string, StrategyMetrics> = {};
  for (const [key, bucket] of grouped.entries()) {
    const totalReturnUSD = bucket.reduce((sum, trade) => sum + trade.netProfitUSD, 0);
    breakdown[key] = {
      winRate: bucket.length === 0 ? 0 : (bucket.filter((trade) => trade.netProfitUSD > 0).length / bucket.length) * 100,
      totalReturnUSD,
      tradeCount: bucket.length,
      avgProfit: bucket.length === 0 ? 0 : totalReturnUSD / bucket.length,
    };
  }

  return breakdown;
}

export function calculatePortfolioMetrics(trades: TradeRecord[]): PortfolioMetrics {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      totalReturnUSD: 0,
      grossProfitUSD: 0,
      totalGasPaidUSD: 0,
      netProfitUSD: 0,
      avgProfitPerTrade: 0,
      gasEfficiency: 0,
      sharpeRatio: 0,
      maxDrawdownPct: 0,
      rolling24hPnL: 0,
      rolling1hPnL: 0,
      strategyBreakdown: {},
      regimeBreakdown: {},
      equityCurve: [],
    };
  }

  const totalTrades = trades.length;
  const grossProfitUSD = trades.reduce((sum, trade) => sum + trade.grossProfitUSD, 0);
  const totalGasPaidUSD = trades.reduce((sum, trade) => sum + trade.gasUsedUSD, 0);
  const netProfitUSD = trades.reduce((sum, trade) => sum + trade.netProfitUSD, 0);
  const winRate = (trades.filter((trade) => trade.netProfitUSD > 0).length / totalTrades) * 100;
  const avgProfitPerTrade = netProfitUSD / totalTrades;
  const gasEfficiency = totalGasPaidUSD === 0 ? 0 : netProfitUSD / totalGasPaidUSD;

  const equityCurve: Array<{ timestamp: number; equity: number }> = [];
  let runningEquity = 0;
  let peakEquity = 0;
  let maxDrawdownPct = 0;
  for (const trade of [...trades].sort((a, b) => a.timestamp - b.timestamp)) {
    runningEquity += trade.netProfitUSD;
    equityCurve.push({ timestamp: trade.timestamp, equity: runningEquity });
    peakEquity = Math.max(peakEquity, runningEquity);
    if (peakEquity > 0) {
      maxDrawdownPct = Math.max(maxDrawdownPct, ((peakEquity - runningEquity) / peakEquity) * 100);
    }
  }

  const dailyReturns = groupDailyReturns(trades);
  const sharpeRatio = stdDev(dailyReturns) === 0 ? 0 : (mean(dailyReturns) / stdDev(dailyReturns)) * Math.sqrt(365);
  const now = Date.now();
  const rolling24hPnL = trades.filter((trade) => now - trade.timestamp <= 86_400_000).reduce((sum, trade) => sum + trade.netProfitUSD, 0);
  const rolling1hPnL = trades.filter((trade) => now - trade.timestamp <= 3_600_000).reduce((sum, trade) => sum + trade.netProfitUSD, 0);

  return {
    totalTrades,
    winRate,
    totalReturnUSD: netProfitUSD,
    grossProfitUSD,
    totalGasPaidUSD,
    netProfitUSD,
    avgProfitPerTrade,
    gasEfficiency,
    sharpeRatio,
    maxDrawdownPct,
    rolling24hPnL,
    rolling1hPnL,
    strategyBreakdown: buildBreakdown(trades, (trade) => trade.strategyId),
    regimeBreakdown: buildBreakdown(trades, (trade) => trade.regime),
    equityCurve,
  };
}