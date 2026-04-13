import { Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './components/Shell';
import { DashboardPage } from './pages/DashboardPage';
import { TradesPage } from './pages/TradesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AgentsPage } from './pages/AgentsPage';
import { PositionsPage } from './pages/PositionsPage';
import { RiskPage } from './pages/RiskPage';
import { MarketPage } from './pages/MarketPage';

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/trades" element={<TradesPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/positions" element={<PositionsPage />} />
        <Route path="/risk" element={<RiskPage />} />
        <Route path="/market" element={<MarketPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}