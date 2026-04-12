import { orchestratorBus, publishError } from '@pancakeswap-agent/core';
import { detectArbitrageOpportunities } from './arbitrage_detector';
import { buildTradeSignal } from './signal_builder';

const STRATEGY_ID = 'arb-v1';
const MIN_DISCREPANCY_PCT = 0.5;

export function startStrategyAgent() {
  console.log('[Strategy Agent] Listening for market:update...');

  orchestratorBus.on('market:update', (state) => {
    try {
      const opportunities = detectArbitrageOpportunities(
        state.pools,
        state.gasPriceGwei,
        MIN_DISCREPANCY_PCT,
      );

      if (opportunities.length === 0) {
        console.log('[Strategy Agent] No arbitrage opportunities found.');
        return;
      }

      const best = opportunities[0];
      const signal = buildTradeSignal(best, state.regime, STRATEGY_ID);

      console.log(
        `[Strategy Agent] Signal emitted: ${signal.direction} ${signal.targetToken} | Profit: $${signal.expectedProfitUSD.toFixed(4)} | Confidence: ${(signal.confidence * 100).toFixed(1)}%`,
      );
      orchestratorBus.emit('strategy:signal', signal);
    } catch (err) {
      publishError('StrategyAgent', err);
    }
  });
}

if (require.main === module) {
  startStrategyAgent();
}
