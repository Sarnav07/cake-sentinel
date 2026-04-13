import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { KpiCard } from '../components/KpiCard';
import { SectionCard } from '../components/SectionCard';
import { useWebSocket } from '../hooks/useWebSocket';
import { fetchMarketState, fetchMetrics, fetchTrades } from '../lib/api';

export function DashboardPage() {
  const metricsQuery = useQuery({ queryKey: ['metrics'], queryFn: fetchMetrics, refetchInterval: 5000 });
  const tradesQuery = useQuery({ queryKey: ['trades'], queryFn: fetchTrades, refetchInterval: 5000 });
  const marketQuery = useQuery({ queryKey: ['market-dashboard'], queryFn: fetchMarketState, refetchInterval: 5000 });
  const [activity, setActivity] = useState<string[]>([]);

  useWebSocket('ws://localhost:3001', (payload) => {
    if (!payload?.type) {
      return;
    }

    const line = `[${new Date().toLocaleTimeString()}] ${String(payload.type).toUpperCase()}`;
    setActivity((current) => [...current.slice(-30), line]);
  });

  const metrics = metricsQuery.data;
  const chartData = metrics?.equityCurve.slice(-30) ?? [];
  const tickerRows = useMemo(
    () => Object.values(marketQuery.data?.pools ?? {}).map((pool) => {
      const price = Number(pool.reserve1) / Math.max(Number(pool.reserve0), 1e-9);
      return `${pool.token0.symbol}/${pool.token1.symbol} ${price.toFixed(4)}`;
    }),
    [marketQuery.data],
  );

  return (
    <div className="page-grid">
      <div className="hero-row">
        <KpiCard label="Net P&L" value={metrics ? `$${metrics.netProfitUSD.toFixed(2)}` : '$0.00'} />
        <KpiCard label="24h P&L" value={metrics ? `$${metrics.rolling24hPnL.toFixed(2)}` : '$0.00'} />
        <KpiCard label="Win Rate" value={metrics ? `${metrics.winRate.toFixed(1)}%` : '0.0%'} />
        <KpiCard label="Sharpe" value={metrics ? metrics.sharpeRatio.toFixed(2) : '0.00'} />
        <KpiCard label="Drawdown" value={metrics ? `${metrics.maxDrawdownPct.toFixed(2)}%` : '0.00%'} />
        <KpiCard label="Trades" value={metrics ? metrics.totalTrades.toString() : '0'} />
      </div>

      <div className="ticker-row">
        <div className="ticker-track">
          {[...tickerRows, ...tickerRows].map((ticker, index) => (
            <span key={`${ticker}-${index}`}>{ticker}</span>
          ))}
        </div>
      </div>

      <div className="dashboard-grid">
        <SectionCard title="Live Equity Curve">
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <XAxis dataKey="timestamp" hide />
                <YAxis hide />
                <Tooltip />
                <Area type="monotone" dataKey="equity" stroke="#00ff88" fill="rgba(0,255,136,0.2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Activity Feed">
          <div className="terminal-feed">
            {(tradesQuery.data ?? []).slice(-5).map((trade) => (
              <div key={trade.txHash} className="terminal-line">
                <span className="terminal-ts">{new Date(trade.timestamp).toLocaleTimeString()}</span>
                <span>[TRADE]</span>
                <span>{trade.pair} {trade.direction} {trade.netProfitUSD >= 0 ? '+' : ''}${trade.netProfitUSD.toFixed(2)}</span>
              </div>
            ))}
            {activity.slice(-12).map((line) => (
              <div key={line} className="terminal-line event-line">
                <span>{line}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}