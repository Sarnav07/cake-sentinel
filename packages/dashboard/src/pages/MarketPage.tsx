import { useQuery } from '@tanstack/react-query';
import { fetchMarketState } from '../lib/api';

export function MarketPage() {
  const { data } = useQuery({ queryKey: ['market'], queryFn: fetchMarketState, refetchInterval: 5000 });
  const pools = Object.values(data?.pools ?? {});

  return (
    <div className="page-panel">
      <h1>Market Intel</h1>
      <div className="kpi-inline">Regime: <strong>{data?.regime ?? 'unknown'}</strong></div>
      <div className="kpi-inline">Gas: <strong>{(data?.gasPriceGwei ?? 0).toFixed(2)} gwei</strong></div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pool</th>
              <th>Pair</th>
              <th>Reserves</th>
              <th>Fee Tier</th>
              <th>Liquidity</th>
              <th>Volume USD</th>
            </tr>
          </thead>
          <tbody>
            {pools.map((pool) => (
              <tr key={pool.address}>
                <td>{pool.address.slice(0, 8)}...{pool.address.slice(-6)}</td>
                <td>{pool.token0.symbol}/{pool.token1.symbol}</td>
                <td>{Number(pool.reserve0).toFixed(2)} / {Number(pool.reserve1).toFixed(2)}</td>
                <td>{pool.feeTier}</td>
                <td>{pool.liquidity}</td>
                <td>${Number(pool.volumeUSD).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}