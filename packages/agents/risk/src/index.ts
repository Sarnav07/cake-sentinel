import { orchestratorBus, publishError, RiskDecision, TradeSignal } from '@pancakeswap-agent/core';
import { CircuitBreaker } from './circuit_breaker';
import { detectAnomaly } from './anomaly_detector';
import { DEFAULT_POLICY } from './policies';
import { PositionTracker } from './position_tracker';

let latestMarketState: Parameters<typeof detectAnomaly>[0] | null = null;
let previousMarketState: Parameters<typeof detectAnomaly>[0] | null = null;

const circuitBreaker = new CircuitBreaker(DEFAULT_POLICY);
const positionTracker = new PositionTracker();
let started = false;
let snapshotTimer: NodeJS.Timeout | null = null;

function buildDecision(signal: TradeSignal, approved: boolean, reason?: string): RiskDecision {
  return {
    signalId: signal.id,
    approved,
    reason,
    maxSlippageBps: DEFAULT_POLICY.maxSlippageBps,
    deadlineSeconds: 300,
  };
}

export function startRiskAgent() {
  if (started) {
    return;
  }
  started = true;

  orchestratorBus.on('market:update', (state) => {
    previousMarketState = latestMarketState;
    latestMarketState = state;

    const anomaly = detectAnomaly(state, previousMarketState ?? undefined);
    if (anomaly.isAnomalous) {
      circuitBreaker.triggerBreaker(anomaly.reason ?? 'market_anomaly');
    }

    const drawdown = circuitBreaker.updateEquity(1000);
    if (drawdown > DEFAULT_POLICY.maxDrawdownPct) {
      circuitBreaker.triggerBreaker('drawdown_limit_breached');
    }

    const stopLossHits = positionTracker.evaluateStopLoss(
      () => {
        const firstPool = Object.values(state.pools)[0];
        if (!firstPool) {
          return 0;
        }
        const reserve0 = Number(firstPool.reserve0);
        const reserve1 = Number(firstPool.reserve1);
        return reserve0 > 0 ? reserve1 / reserve0 : 0;
      },
      DEFAULT_POLICY.stopLossPct,
    );

    if (stopLossHits.length > 0) {
      circuitBreaker.triggerBreaker('stop_loss_triggered');
    }
  });

  orchestratorBus.on('execution:trade', (trade) => {
    positionTracker.recordTrade(trade);
    circuitBreaker.updateEquity(Math.max(0, 1000 + trade.netProfitUSD));
    if (circuitBreaker.shouldTrigger()) {
      circuitBreaker.triggerBreaker('equity_drawdown_breached');
    }
  });

  orchestratorBus.on('strategy:signal', (signal) => {
    try {
      console.log(`[Risk Agent] Evaluating TradeSignal ${signal.id} (Size: $${signal.sizeUSD.toFixed(2)})`);

      if (circuitBreaker.isPaused) {
        console.log(`[Risk Agent] ❌ Denied: Circuit Breaker is active.`);
        orchestratorBus.emit('risk:decision', buildDecision(signal, false, 'circuit_breaker_active'));
        return;
      }

      if (!latestMarketState) {
        console.log(`[Risk Agent] ❌ Denied: No market state available.`);
        orchestratorBus.emit('risk:decision', buildDecision(signal, false, 'no_market_state'));
        return;
      }

      const anomaly = detectAnomaly(latestMarketState, previousMarketState ?? undefined);
      if (anomaly.isAnomalous) {
        console.log(`[Risk Agent] ❌ Denied: Market Anomaly Detected (${anomaly.reason})`);
        orchestratorBus.emit('risk:decision', buildDecision(signal, false, anomaly.reason ?? 'market_anomaly'));
        return;
      }

      if (positionTracker.exceedsMaxPositionCount(DEFAULT_POLICY.maxOpenPositions)) {
        console.log(`[Risk Agent] ❌ Denied: Position tracking limit exceeded (${DEFAULT_POLICY.maxOpenPositions})`);
        orchestratorBus.emit('risk:decision', buildDecision(signal, false, 'max_open_positions_exceeded'));
        return;
      }

      if (signal.sizeUSD > DEFAULT_POLICY.maxPositionSizeUSD) {
        console.log(`[Risk Agent] ❌ Denied: Trade exceeds $${DEFAULT_POLICY.maxPositionSizeUSD} maximum limit!`);
        orchestratorBus.emit('risk:decision', buildDecision(signal, false, 'position_size_limit_exceeded'));
        return;
      }

      const gasCostUSD = signal.estimatedGasUSD ?? 0;
      if (gasCostUSD > DEFAULT_POLICY.maxGasCostUSD) {
        console.log(`[Risk Agent] ❌ Denied: Gas exceeds maximum allowed cost.`);
        orchestratorBus.emit('risk:decision', buildDecision(signal, false, 'gas_cost_too_high'));
        return;
      }

      if (signal.expectedProfitUSD - gasCostUSD < DEFAULT_POLICY.minExpectedProfitUSD) {
        console.log(`[Risk Agent] ❌ Denied: Insufficient net profit after gas costs.`);
        orchestratorBus.emit('risk:decision', buildDecision(signal, false, 'insufficient_expected_profit'));
        return;
      }

      console.log(`[Risk Agent] ✅ Approved TradeSignal ${signal.id} - Proceeding to Execution.`);
      orchestratorBus.emit('risk:decision', buildDecision(signal, true));
    } catch (error) {
      publishError('RiskAgent', error);
    }
  });

  snapshotTimer = setInterval(() => {
    const state = getRiskState();
    orchestratorBus.emit('portfolio:snapshot', {
      timestamp: Date.now(),
      equityUSD: 1000,
      drawdownPct: state.drawdownPct,
      openPositions: state.positionCount,
      totalTrades: state.positionCount,
    });
  }, 60_000);
}

export function getRiskState() {
  return {
    isPaused: circuitBreaker.isPaused,
    drawdownPct: circuitBreaker.currentDrawdownPct,
    positionCount: positionTracker.positionCount,
    totalCapitalDeployedUSD: positionTracker.getTotalCapitalDeployed(),
    positions: positionTracker.getOpenPositions(),
  };
}

if (require.main === module) {
  startRiskAgent();
}