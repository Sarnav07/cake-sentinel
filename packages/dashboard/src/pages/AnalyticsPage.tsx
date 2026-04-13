import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchMetrics } from '../lib/api';

export function AnalyticsPage() {
  const { data } = useQuery({ queryKey: ['metrics'], queryFn: fetchMetrics, refetchInterval: 5000 });
  const strategyRows = Object.entries(data?.strategyBreakdown ?? {}).map(([name, value]) => ({ name, ...value }));
  const regimeRows = Object.entries(data?.regimeBreakdown ?? {}).map(([name, value]) => ({ name, ...value }));

  return (
    <div className="page-grid">
      <div className="page-panel">
        <h1>P&L Composition</h1>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                {
                  name: 'Totals',
                  gross: data?.grossProfitUSD ?? 0,
                  gas: data?.totalGasPaidUSD ?? 0,
                  net: data?.netProfitUSD ?? 0,
                },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="gross" fill="#00ff88" />
              <Bar dataKey="gas" fill="#ffaa00" />
              <Bar dataKey="net" fill="#00aaff" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="page-panel">
        <h1>Strategy Breakdown</h1>
        <div className="metric-list">
          {strategyRows.length === 0 ? <div className="muted">No strategy metrics yet.</div> : strategyRows.map((row) => (
            <div className="metric-row" key={row.name}>
              <strong>{row.name}</strong>
              <span>Trades: {row.tradeCount}</span>
              <span>Win Rate: {row.winRate.toFixed(1)}%</span>
              <span>Return: ${row.totalReturnUSD.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="page-panel">
        <h1>Regime Breakdown</h1>
        <div className="chart-box small">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={regimeRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="tradeCount" fill="#00aaff" />
              <Bar dataKey="winRate" fill="#00ff88" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="page-panel">
        <h1>Risk-Adjusted Metrics</h1>
        <div className="kpi-inline">Sharpe Ratio: <strong>{(data?.sharpeRatio ?? 0).toFixed(2)}</strong></div>
        <div className="kpi-inline">Max Drawdown: <strong>{(data?.maxDrawdownPct ?? 0).toFixed(2)}%</strong></div>
        <div className="kpi-inline">Gas Efficiency: <strong>{(data?.gasEfficiency ?? 0).toFixed(2)}x</strong></div>
      </div>
    </div>
  );
}