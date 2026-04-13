import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPositions } from '../lib/api';

export function PositionsPage() {
  const { data } = useQuery({ queryKey: ['positions'], queryFn: fetchPositions, refetchInterval: 5000 });
  const totalCapital = useMemo(
    () => (data ?? []).reduce((sum, position) => sum + position.sizeUSD, 0),
    [data],
  );

  return (
    <div className="page-panel">
      <h1>Open Positions</h1>
      <div className="kpi-inline">Capital Deployed: <strong>${totalCapital.toFixed(2)}</strong></div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pair</th>
              <th>Size USD</th>
              <th>Entry Price</th>
              <th>Opened</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((position) => (
              <tr key={`${position.pair}-${position.timestamp}`}>
                <td>{position.pair}</td>
                <td>${position.sizeUSD.toFixed(2)}</td>
                <td>{position.entryPrice.toFixed(6)}</td>
                <td>{new Date(position.timestamp).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}