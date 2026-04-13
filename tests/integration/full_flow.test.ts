import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { orchestratorBus } from '../../packages/core/src/orchestrator';
import { startStrategyAgent } from '../../packages/agents/strategy/src/index';
import { startRiskAgent } from '../../packages/agents/risk/src/index';
import { startExecutionAgent } from '../../packages/agents/execution/src/index';
import { startPortfolioAgent } from '../../packages/agents/portfolio/src/index';

vi.mock('../../packages/agents/execution/src/router', () => ({
  executeSwap: vi.fn(async () => '0xdeadbeef'),
}));

function makePool(address: string, reserve0: string, reserve1: string) {
  return {
    address,
    token0: { address: '0x1111111111111111111111111111111111111111', symbol: 'WBNB', decimals: 18 },
    token1: { address: '0x2222222222222222222222222222222222222222', symbol: 'USDT', decimals: 18 },
    reserve0,
    reserve1,
    feeTier: 2500,
    liquidity: '100000',
    volumeUSD: '1000',
  };
}

describe('full flow integration', () => {
  let closeServer: (() => Promise<void>) | null = null;

  beforeEach(async () => {
    process.env.WALLET_ADDRESS = '0x3333333333333333333333333333333333333333';

    const dataDir = path.join(process.cwd(), 'data');
    await mkdir(dataDir, { recursive: true });
    await writeFile(path.join(dataDir, 'trades.json'), '[]', 'utf8');

    startStrategyAgent();
    startRiskAgent();
    startExecutionAgent();
    const portfolioServer = await startPortfolioAgent();

    closeServer = async () => {
      await new Promise<void>((resolve, reject) => {
        portfolioServer.server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    };
  });

  afterEach(async () => {
    if (closeServer) {
      await closeServer();
      closeServer = null;
    }
  });

  it('runs market -> strategy -> risk -> execution -> portfolio and blocks after circuit break', async () => {
    const approvedDecisions: Array<{ approved: boolean; reason?: string }> = [];
    const trades: Array<{ netProfitUSD: number }> = [];

    orchestratorBus.on('risk:decision', (decision) => {
      approvedDecisions.push({ approved: decision.approved, reason: decision.reason });
    });

    orchestratorBus.on('execution:trade', (trade) => {
      trades.push({ netProfitUSD: trade.netProfitUSD });
    });

    const poolAAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const poolBAddress = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

    // Prime risk agent state before generating tradable discrepancy.
    orchestratorBus.emit('market:update', {
      timestamp: Date.now(),
      regime: 'trending',
      gasPriceGwei: 2,
      pools: {
        [poolAAddress]: makePool(poolAAddress, '100', '30000'),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Discrepancy should generate an approved signal and execution trade.
    orchestratorBus.emit('market:update', {
      timestamp: Date.now(),
      regime: 'trending',
      gasPriceGwei: 2,
      pools: {
        [poolAAddress]: makePool(poolAAddress, '100', '30000'),
        [poolBAddress]: makePool(poolBAddress, '100', '42000'),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(approvedDecisions.some((decision) => decision.approved)).toBe(true);
    expect(trades.length).toBeGreaterThan(0);
    expect(trades[0].netProfitUSD).toBeGreaterThanOrEqual(0);

    const metricsResponse = await fetch('http://localhost:3001/api/metrics');
    const metrics = await metricsResponse.json() as { totalTrades: number; winRate: number };
    expect(metrics.totalTrades).toBeGreaterThanOrEqual(1);
    expect(metrics.winRate).toBeGreaterThan(0);

    // Stale market state should trigger anomaly -> circuit breaker.
    orchestratorBus.emit('market:update', {
      timestamp: Date.now() - 60_000,
      regime: 'high_vol',
      gasPriceGwei: 2,
      pools: {
        [poolAAddress]: makePool(poolAAddress, '100', '20000'),
        [poolBAddress]: makePool(poolBAddress, '100', '34000'),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Next opportunity should be rejected because breaker is active.
    orchestratorBus.emit('market:update', {
      timestamp: Date.now(),
      regime: 'trending',
      gasPriceGwei: 2,
      pools: {
        [poolAAddress]: makePool(poolAAddress, '100', '30000'),
        [poolBAddress]: makePool(poolBAddress, '100', '35000'),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(
      approvedDecisions.some((decision) => !decision.approved && decision.reason === 'circuit_breaker_active'),
    ).toBe(true);
  });
});
