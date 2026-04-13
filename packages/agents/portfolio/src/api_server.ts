import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import { AgentStatus, MarketState, PortfolioSnapshot, TradeEvent } from '@pancakeswap-agent/core';
import { calculatePortfolioMetrics, PortfolioMetrics } from './metrics';
import { TradeRecord, getAllTrades } from './trade_ledger';

export interface PortfolioApiState {
  metrics: PortfolioMetrics;
  trades: TradeRecord[];
  equityCurve: Array<{ timestamp: number; equity: number }>;
  positions: Array<{ pair: string; sizeUSD: number; entryPrice: number; timestamp: number }>;
  marketState: MarketState | null;
  riskStatus: { isPaused: boolean; drawdownPct: number };
  agentStatuses: Record<string, AgentStatus>;
}

export function createPortfolioApiServer(state: PortfolioApiState) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/metrics', (_req, res) => res.json(state.metrics));
  app.get('/api/trades', (_req, res) => res.json(state.trades));
  app.get('/api/trades/recent', (_req, res) => res.json(state.trades.slice(-50)));
  app.get('/api/equity-curve', (_req, res) => res.json(state.equityCurve));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', agentStatuses: state.agentStatuses, timestamp: Date.now() }));
  app.get('/api/positions', (_req, res) => res.json(state.positions));
  app.get('/api/risk/status', (_req, res) => res.json(state.riskStatus));
  app.get('/api/market/state', (_req, res) => res.json(state.marketState));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  wss.on('connection', (socket) => {
    socket.send(JSON.stringify({ type: 'snapshot', data: state.metrics }));
  });

  return {
    app,
    server,
    wss,
    broadcast(payload: unknown) {
      const message = JSON.stringify(payload);
      for (const client of wss.clients) {
        if (client.readyState === client.OPEN) {
          client.send(message);
        }
      }
    },
  };
}

export async function loadPortfolioStateFromTrades(): Promise<PortfolioApiState> {
  const trades = await getAllTrades();
  const metrics = calculatePortfolioMetrics(trades);
  return {
    metrics,
    trades,
    equityCurve: metrics.equityCurve,
    positions: [],
    marketState: null,
    riskStatus: { isPaused: false, drawdownPct: 0 },
    agentStatuses: {},
  };
}