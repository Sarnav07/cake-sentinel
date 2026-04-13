import { NavLink } from 'react-router-dom';
import { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMarketState, fetchRiskStatus } from '../lib/api';

const NAV_ITEMS = [
  ['/', 'Dashboard'],
  ['/trades', 'Trades'],
  ['/analytics', 'Analytics'],
  ['/agents', 'Agents'],
  ['/positions', 'Positions'],
  ['/risk', 'Risk'],
  ['/market', 'Market'],
];

export function Shell({ children }: { children: ReactNode }) {
  const { data: market } = useQuery({ queryKey: ['market-header'], queryFn: fetchMarketState, refetchInterval: 5000 });
  const { data: risk } = useQuery({ queryKey: ['risk-header'], queryFn: fetchRiskStatus, refetchInterval: 5000 });
  const statusLabel = risk?.isPaused ? 'CIRCUIT BREAK' : 'LIVE';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">NEXUS</div>
          <div className="brand-sub">PancakeSwap Terminal</div>
        </div>
        <nav className="nav">
          {NAV_ITEMS.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main-panel">
        <header className="topbar">
          <div className={`status-chip ${risk?.isPaused ? 'danger' : 'ok'}`}>{statusLabel}</div>
          <div className="topbar-item">BSC TESTNET</div>
          <div className="topbar-item">Gas {(market?.gasPriceGwei ?? 0).toFixed(2)} gwei</div>
          <div className="topbar-item">UTC {new Date().toISOString().slice(11, 19)}</div>
        </header>
        {children}
      </main>
    </div>
  );
}