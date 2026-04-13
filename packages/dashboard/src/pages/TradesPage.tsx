import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTrades } from '../lib/api';

export function TradesPage() {
  const { data } = useQuery({ queryKey: ['trades'], queryFn: fetchTrades, refetchInterval: 5000 });
  const [strategyFilter, setStrategyFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [pairFilter, setPairFilter] = useState('');
  const [onlyProfitable, setOnlyProfitable] = useState(false);
  const [page, setPage] = useState(1);

  const strategies = useMemo(
    () => ['all', ...Array.from(new Set((data ?? []).map((trade) => trade.strategyId)))],
    [data],
  );

  const filtered = useMemo(
    () => (data ?? []).filter((trade) => {
      if (strategyFilter !== 'all' && trade.strategyId !== strategyFilter) return false;
      if (directionFilter !== 'all' && trade.direction !== directionFilter) return false;
      if (pairFilter && !trade.pair.toLowerCase().includes(pairFilter.toLowerCase())) return false;
      if (onlyProfitable && trade.netProfitUSD <= 0) return false;
      return true;
    }),
    [data, strategyFilter, directionFilter, pairFilter, onlyProfitable],
  );

  const pageSize = 50;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totals = useMemo(
    () => filtered.reduce(
      (acc, trade) => {
        acc.size += trade.sizeUSD;
        acc.gas += trade.gasUsedUSD;
        acc.gross += trade.grossProfitUSD;
        acc.net += trade.netProfitUSD;
        return acc;
      },
      { size: 0, gas: 0, gross: 0, net: 0 },
    ),
    [filtered],
  );

  return (
    <div className="page-panel">
      <h1>Trade History</h1>
      <div className="filter-bar">
        <select value={strategyFilter} onChange={(event) => setStrategyFilter(event.target.value)}>
          {strategies.map((strategy) => <option value={strategy} key={strategy}>{strategy}</option>)}
        </select>
        <select value={directionFilter} onChange={(event) => setDirectionFilter(event.target.value as 'all' | 'buy' | 'sell')}>
          <option value="all">all directions</option>
          <option value="buy">buy</option>
          <option value="sell">sell</option>
        </select>
        <input
          value={pairFilter}
          onChange={(event) => setPairFilter(event.target.value)}
          placeholder="search pair"
        />
        <label className="toggle-row">
          <input type="checkbox" checked={onlyProfitable} onChange={(event) => setOnlyProfitable(event.target.checked)} />
          profitable only
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th><th>Pair</th><th>Dir</th><th>Size</th><th>Entry</th><th>Gas</th><th>Gross</th><th>Net</th><th>Strategy</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((trade) => (
              <tr key={trade.txHash} className={trade.netProfitUSD >= 0 ? 'row-profit' : 'row-loss'}>
                <td>{new Date(trade.timestamp).toLocaleTimeString()}</td>
                <td>{trade.pair}</td>
                <td>{trade.direction}</td>
                <td>${trade.sizeUSD.toFixed(2)}</td>
                <td>{trade.entryPrice.toFixed(6)}</td>
                <td>${trade.gasUsedUSD.toFixed(2)}</td>
                <td>${trade.grossProfitUSD.toFixed(2)}</td>
                <td>${trade.netProfitUSD.toFixed(2)}</td>
                <td>{trade.strategyId}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}><strong>Totals</strong></td>
              <td><strong>${totals.size.toFixed(2)}</strong></td>
              <td>-</td>
              <td><strong>${totals.gas.toFixed(2)}</strong></td>
              <td><strong>${totals.gross.toFixed(2)}</strong></td>
              <td><strong>${totals.net.toFixed(2)}</strong></td>
              <td>-</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="pagination-row">
        <button disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Prev</button>
        <span>Page {currentPage} / {pageCount}</span>
        <button disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
      </div>
    </div>
  );
}