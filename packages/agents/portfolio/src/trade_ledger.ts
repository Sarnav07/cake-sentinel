import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

export interface TradeRecord {
  txHash: string;
  signalId: string;
  strategyId: string;
  pair: string;
  direction: 'buy' | 'sell';
  sizeUSD: number;
  entryPrice: number;
  exitPrice?: number;
  grossProfitUSD: number;
  gasUsedUSD: number;
  feesUSD: number;
  netProfitUSD: number;
  timestamp: number;
  regime: string;
  poolAddress: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const LEDGER_PATH = path.join(DATA_DIR, 'trades.json');

async function ensureLedgerFile(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(LEDGER_PATH, 'utf8');
  } catch {
    await writeFile(LEDGER_PATH, '[]', 'utf8');
  }
}

export async function appendTrade(trade: TradeRecord): Promise<void> {
  await ensureLedgerFile();
  const trades = await getAllTrades();
  trades.push(trade);
  await writeFile(LEDGER_PATH, JSON.stringify(trades, null, 2), 'utf8');
}

export async function getAllTrades(): Promise<TradeRecord[]> {
  await ensureLedgerFile();
  const raw = await readFile(LEDGER_PATH, 'utf8');
  return JSON.parse(raw) as TradeRecord[];
}

export async function getTradesSince(timestamp: number): Promise<TradeRecord[]> {
  const trades = await getAllTrades();
  return trades.filter((trade) => trade.timestamp >= timestamp);
}

export async function getTradesByStrategy(strategyId: string): Promise<TradeRecord[]> {
  const trades = await getAllTrades();
  return trades.filter((trade) => trade.strategyId === strategyId);
}

export function ledgerPath(): string {
  return LEDGER_PATH;
}