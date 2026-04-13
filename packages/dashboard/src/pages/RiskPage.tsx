import { useQuery } from '@tanstack/react-query';
import { fetchRiskStatus } from '../lib/api';

export function RiskPage() {
  const { data } = useQuery({ queryKey: ['risk'], queryFn: fetchRiskStatus, refetchInterval: 5000 });
  const isPaused = data?.isPaused ?? false;

  return (
    <div className="page-grid two-col">
      <div className="page-panel">
        <h1>Circuit Breaker</h1>
        <div className={`breaker-banner ${isPaused ? 'paused' : 'live'}`}>
          {isPaused ? 'CIRCUIT BREAK TRIGGERED' : 'TRADING ACTIVE'}
        </div>
        <div className="kpi-inline">Current drawdown: <strong>{(data?.drawdownPct ?? 0).toFixed(2)}%</strong></div>
      </div>

      <div className="page-panel">
        <h1>Risk Policy</h1>
        <ul className="policy-list">
          <li>Max position size: 20%</li>
          <li>Max open positions: 5</li>
          <li>Stop loss: 5%</li>
          <li>Max drawdown: 10%</li>
          <li>Max gas cost: $15</li>
          <li>Min expected profit: $2</li>
          <li>Max slippage: 50 bps</li>
        </ul>
      </div>
    </div>
  );
}